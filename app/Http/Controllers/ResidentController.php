<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Job;
use App\Models\Unit;
use App\Models\Payment;
use App\Models\Complaint;
use App\Models\Rating;
use App\Models\ChatbotLog;
use App\Models\KnowledgeBase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ResidentController extends Controller
{
    /**
     * Compile resident's primary dashboard metrics, next collection calendar details, and financial warnings.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $resident = $request->user();
        
        // Locate unit registered to this resident (with floor and block info)
        $unit = Unit::with('floor.block')->where('resident_id', $resident->id)->first();

        if (!$unit) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'has_unit' => false,
                    'message' => 'Your profile does not currently have an assigned apartment unit code. Contact the block manager.'
                ]
            ]);
        }

        $todayStr = Carbon::today()->format('Y-m-d');

        // Locate next collection schedule (Floor wide or Unit specific)
        $nextJob = Job::with('worker')
            ->where(function($q) use ($unit) {
                $q->where('unit_id', $unit->id)
                  ->orWhere(function($sq) use ($unit) {
                      $sq->whereNull('unit_id')
                        ->where('floor_id', $unit->floor_id);
                  });
            })
            ->whereDate('scheduled_date', '>=', $todayStr)
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderBy('scheduled_date', 'asc')
            ->orderBy('shift', 'asc')
            ->first();

        // Count pending monthly fee or bulk pickups
        $unpaidBalanceSum = Payment::where('resident_id', $resident->id)
            ->where('status', 'unpaid')
            ->sum('amount');

        $pendingBillsCount = Payment::where('resident_id', $resident->id)
            ->where('status', 'unpaid')
            ->count();

        // Recent completed jobs audit tracking
        $recentJobsFinished = Job::where(function($q) use ($unit) {
                $q->where('unit_id', $unit->id)
                  ->orWhere(function($sq) use ($unit) {
                      $sq->whereNull('unit_id')
                        ->where('floor_id', $unit->floor_id);
                  });
            })
            ->whereIn('status', ['done', 'issue'])
            ->orderBy('scheduled_date', 'desc')
            ->take(3)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'has_unit' => true,
                'unit_number' => $unit->unit_number,
                'block_name' => $unit->floor && $unit->floor->block ? $unit->floor->block->name : null,
                'floor_number' => $unit->floor ? $unit->floor->floor_number : null,
                'qr_code_hash' => $unit->qr_code_hash,
                'unpaid_balance_lkr' => $unpaidBalanceSum,
                'pending_bills_count' => $pendingBillsCount,
                'next_pickup' => $nextJob ? [
                    'scheduled_date' => $nextJob->scheduled_date->format('Y-m-d'),
                    'shift' => ucfirst($nextJob->shift),
                    'status' => $nextJob->status,
                    'worker' => $nextJob->worker ? [
                        'name' => $nextJob->worker->name,
                        'phone' => $nextJob->worker->phone,
                        'photo' => $nextJob->worker->profile_photo_path ? asset('storage/' . $nextJob->worker->profile_photo_path) : null
                    ] : null
                ] : null,
                'recent_pickups' => $recentJobsFinished
            ]
        ]);
    }

    /**
     * Timeline feed tracking both upcoming scheduled bookings and historic logs.
     */
    public function collectionTimeline(Request $request): JsonResponse
    {
        $resident = $request->user();
        $unit = Unit::where('resident_id', $resident->id)->first();

        if (!$unit) {
            return response()->json(['status' => 'error', 'message' => 'No unit registered'], 400);
        }

        $allJobs = Job::with('worker')
            ->where(function($q) use ($unit) {
                $q->where('unit_id', $unit->id)
                  ->orWhere(function($sq) use ($unit) {
                      $sq->whereNull('unit_id')
                        ->where('floor_id', $unit->floor_id);
                  });
            })
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('shift', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $allJobs
        ]);
    }

    /**
     * AI advisory chatbot "Eco-Bot" powered by Retrieval Augmented Generation (RAG).
     */
    public function chatWithEcoBot(Request $request): JsonResponse
    {
        $resident = $request->user();

        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $userMessage = $request->message;

        // Perform semantic reference lookup inside structural KnowledgeBase tables
        $words = preg_split('/\s+/', strtolower($userMessage));
        $kbArticles = KnowledgeBase::query();
        
        $kbArticles->where(function($q) use ($words) {
            foreach ($words as $word) {
                if (strlen($word) > 3) { // avoid tiny filler words
                    $q->orWhere('tags', 'like', "%{$word}%")
                      ->orWhere('title', 'like', "%{$word}%")
                      ->orWhere('category', 'like', "%{$word}%");
                }
            }
        });

        $matchedArticles = $kbArticles->take(3)->get();
        
        // Build contextual references for Gemini system parsing
        $context = "";
        if ($matchedArticles->count() > 0) {
            $context .= "Matched Knowledge Base Guides:\n";
            foreach ($matchedArticles as $art) {
                $context .= "Category: [{$art->category}] | Title: {$art->title}\nGuide content:\n{$art->content}\n---\n";
            }
        } else {
            $context .= "No direct knowledge base files matches. Advise standard resident codes.\n";
        }

        // Fetch past active conversational threads for continuity
        $pastLogs = ChatbotLog::where('resident_id', $resident->id)
            ->orderBy('id', 'desc')
            ->take(4)
            ->get()
            ->reverse();

        $threadHistory = [];
        foreach ($pastLogs as $log) {
            $threadHistory[] = "User: " . $log->user_message;
            $threadHistory[] = "Eco-Bot: " . $log->bot_response;
        }
        $dialogHistoryString = implode("\n", $threadHistory);

        // Prep prompt instructions
        $systemInstruction = "You are Eco-Bot, the intelligent real-time waste reduction advisor representing EcoTrack.
You guide residents of our high-rise complex on local recycling guides, sorting hazardous waste vs biodegradable materials, collection calendars, and how to reduce household carbon footprints.
Always reference the matched knowledge base articles if provided.
Keep your response professional, practical, encouraging, and under 150 words. Do not make up facts. Today's date is: 2026-05-20.

{$context}

Conversational Thread History:
{$dialogHistoryString}";

        // Send payload to Google Gemini API
        $apiKey = env('GEMINI_API_KEY');
        if (empty($apiKey) || $apiKey === 'MY_GEMINI_API_KEY') {
            // Safe fallback response if key not available in sandbox environment
            $botResponse = "Hello! I am Eco-Bot, your advisor. I noticed that my Gemini API coordinates are currently on sandbox placeholders. Based on our sorting directives: recycle clean glass, pet plastics, and cards safely. Compost wet organic scraps under Block scheme norms. Let me know if you would like me to detail further!";
        } else {
            try {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;
                
                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($endpoint, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => "User Ask: " . $userMessage]
                            ]
                        ]
                    ],
                    'systemInstruction' => [
                        'parts' => [
                            ['text' => $systemInstruction]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'maxOutputTokens' => 400
                    ]
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $botResponse = $json['candidates'][0]['content']['parts'][0]['text'] ?? "Could not resolve response text.";
                } else {
                    $botResponse = "Apologies, I encountered a connection issue on my backend model server. Please retry in a few moments!";
                }
            } catch (\Exception $e) {
                $botResponse = "Apologies, our advisory nodes are currently re-indexing guidelines. Here is a helpful general tip: Always segregate biodegradable wet waste from recyclables. Let me know how I can help.";
            }
        }

        // Keep a record of the conversation
        $log = ChatbotLog::create([
            'resident_id' => $resident->id,
            'user_message' => $userMessage,
            'bot_response' => $botResponse,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'log_id' => $log->id,
                'reply' => $botResponse
            ]
        ]);
    }

    /**
     * Users feedback ratings logged onto Eco-Bot chatbot response.
     */
    public function rateChatbotResponse(Request $request, $id): JsonResponse
    {
        $resident = $request->user();
        $log = ChatbotLog::where('resident_id', $resident->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'is_helpful' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $log->update([
            'is_helpful' => $request->is_helpful
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Chatbot response feedback preserved.'
        ]);
    }

    /**
     * Book special waste pickups (e.g. bulky e-waste/sofa removal).
     * Integrates booking scheduler with billing checkout structures dynamically.
     */
    public function requestBulkRemoval(Request $request): JsonResponse
    {
        $resident = $request->user();
        $unit = Unit::with('floor.block')->where('resident_id', $resident->id)->first();

        if (!$unit) {
            return response()->json(['status' => 'error', 'message' => 'No unit registered'], 400);
        }

        $validator = Validator::make($request->all(), [
            'category' => 'required|string', // e.g. "Electronic Waste", "Bulky Furniture"
            'description' => 'required|string|min:4',
            'pickup_date' => 'required|date|after_or_equal:today',
            'shift' => 'required|in:morning,evening,night',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Special pickups carry a dynamic service fee of LKR 1500
        $fee = 1500.00;
        $refCode = sprintf('SP-%s-%s', Carbon::now()->format('Ymd'), Str::upper(Str::random(5)));

        // Create billing invoice record
        $payment = Payment::create([
            'resident_id' => $resident->id,
            'unit_id' => $unit->id,
            'amount' => $fee,
            'status' => 'unpaid',
            'payment_type' => 'special_pickup',
            'reference_code' => $refCode,
            'notes' => 'Special Removal Fee: ' . $request->category . ' (' . $request->description . ')',
        ]);

        // Auto assign a routine worker on morning/evening shift matching the block
        $worker = User::where('role', 'worker')
            ->where('shift', $request->shift)
            ->where('status', 'active')
            ->first() ?? User::where('role', 'worker')->where('status', 'active')->first();

        // Concurrently schedule a pending specialized job!
        $job = Job::create([
            'worker_id' => $worker->id ?? null,
            'block_id' => $unit->floor->block_id,
            'floor_id' => $unit->floor_id,
            'unit_id' => $unit->id,
            'scheduled_date' => $request->pickup_date,
            'shift' => $request->shift,
            'status' => 'pending',
            'issue_reason' => 'Special Pickup Invoice Code: ' . $refCode
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Specialized pickup booked successfully. Payment invoice issued.',
            'data' => [
                'payment_id' => $payment->id,
                'reference_code' => $refCode,
                'amount' => $fee,
                'job_details' => $job->load('worker')
            ]
        ], 210);
    }

    /**
     * List billing transactions and status.
     */
    public function paymentHistory(Request $request): JsonResponse
    {
        $resident = $request->user();

        $payments = Payment::with('unit')
            ->where('resident_id', $resident->id)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $payments
        ]);
    }

    /**
     * Initiate payment session simulating Stripe / PayHere gateway redirect routes.
     */
    public function initiatePaymentSession(Request $request, $id): JsonResponse
    {
        $resident = $request->user();
        $payment = Payment::where('resident_id', $resident->id)->findOrFail($id);

        if ($payment->status === 'paid') {
            return response()->json([
                'status' => 'error',
                'message' => 'This invoice has already been fully settled.'
            ], 400);
        }

        // Return mock redirect keys and callback channels representing sandboxed environments
        $gatewaySessionId = 'SESSION-' . Str::upper(Str::random(16));
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'reference_code' => $payment->reference_code,
                'gateway' => 'payhere_stripe_sandbox',
                'session_id' => $gatewaySessionId,
                'checkout_redirect_url' => asset("payments/sandbox-gateway?session={$gatewaySessionId}&payment={$payment->id}")
            ]
        ]);
    }

    /**
     * Accept callback signatures from payments.
     */
    public function confirmGatewayPayment(Request $request, $id): JsonResponse
    {
        $resident = $request->user();
        $payment = Payment::where('resident_id', $resident->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'payment_method' => 'required|in:stripe,payhere,bank_transfer',
            'gateway_transaction_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $payment->update([
            'status' => 'paid',
            'payment_method' => $request->payment_method,
            'transaction_id' => $request->gateway_transaction_id,
            'paid_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Payment settled successfully! Digital invoice updated.',
            'data' => $payment
        ]);
    }

    /**
     * Retrieve completed collection jobs waiting for rater feedback input.
     */
    public function getPendingRatings(Request $request): JsonResponse
    {
        $resident = $request->user();
        $unit = Unit::where('resident_id', $resident->id)->first();

        if (!$unit) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        // Fetch completed jobs on this unit that do not have a rating yet
        $jobsToRate = Job::with('worker')
            ->where('unit_id', $unit->id)
            ->where('status', 'done')
            ->whereNotNull('worker_id')
            ->whereDoesntHave('rating', function($q) use ($resident) {
                $q->where('resident_id', $resident->id);
            })
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $jobsToRate
        ]);
    }

    /**
     * Submit rating stars feedback representing our Worker Performance metrics.
     */
    public function rateWorker(Request $request): JsonResponse
    {
        $resident = $request->user();

        $validator = Validator::make($request->all(), [
            'job_id' => 'required|exists:jobs,id',
            'worker_id' => 'required|exists:users,id',
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Assert job is done
        $job = Job::findOrFail($request->job_id);
        if ($job->status !== 'done') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot rate an incomplete or pending task.'
            ], 400);
        }

        // Verify duplicate prevention
        $exists = Rating::where('job_id', $request->job_id)
            ->where('resident_id', $resident->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'status' => 'error',
                'message' => 'You have already submitted a rating feedback for this specific job action.'
            ], 400);
        }

        $rating = Rating::create([
            'job_id' => $request->job_id,
            'resident_id' => $resident->id,
            'worker_id' => $request->worker_id,
            'rating' => $request->rating,
            'feedback' => $request->feedback,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Successfully submitted {$request->rating}-star worker rating reviews.",
            'data' => $rating
        ], 201);
    }

    /**
     * View complaints.
     */
    public function myComplaints(Request $request): JsonResponse
    {
        $resident = $request->user();

        $complaints = Complaint::with('job.worker')
            ->where('resident_id', $resident->id)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $complaints
        ]);
    }

    /**
     * Report missed collections or lodge behavioral grievances.
     */
    public function reportMissedCollection(Request $request): JsonResponse
    {
        $resident = $request->user();
        $unit = Unit::where('resident_id', $resident->id)->first();

        $validator = Validator::make($request->all(), [
            'category' => 'required|in:missed_collection,worker_rudeness,spilled_waste,wrong_time,other',
            'description' => 'required|string|min:10',
            'job_id' => 'nullable|exists:jobs,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $complaintCode = 'C-' . mt_rand(100, 999);

        $complaint = Complaint::create([
            'complaint_code' => $complaintCode,
            'resident_id' => $resident->id,
            'unit_id' => $unit->id ?? null,
            'job_id' => $request->job_id,
            'category' => $request->category,
            'description' => $request->description,
            'status' => 'open',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Missed collection complaint lodged successfully. Reference Code: {$complaintCode}",
            'data' => $complaint
        ], 210);
    }
}
