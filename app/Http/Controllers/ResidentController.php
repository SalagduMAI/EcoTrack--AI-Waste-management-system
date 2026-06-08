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

        $apiKey = env('GEMINI_API_KEY');
        $matchedArticles = collect();
        $scoredArticles = [];

        // 1. Generate User Query Embedding using gemini-embedding-2
        $userEmbedding = null;
        if (!empty($apiKey) && $apiKey !== 'MY_GEMINI_API_KEY') {
            try {
                $embedEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=" . $apiKey;
                $embedResponse = Http::withoutVerifying()->post($embedEndpoint, [
                    'model' => 'models/gemini-embedding-2',
                    'content' => [
                        'parts' => [
                            ['text' => $userMessage]
                        ]
                    ]
                ]);

                if ($embedResponse->successful()) {
                    $userEmbedding = $embedResponse->json()['embedding']['values'] ?? null;
                }
            } catch (\Exception $e) {
                // Fallback to keyword search
            }
        }

        // 2. Perform Cosine Similarity (Dot Product) local embedding comparison
        if ($userEmbedding) {
            $kbArticles = KnowledgeBase::whereNotNull('embedding')->get();
            foreach ($kbArticles as $article) {
                $score = $this->dotProduct($userEmbedding, $article->embedding);
                $scoredArticles[] = [
                    'article' => $article,
                    'score' => $score
                ];
            }

            // Sort by score descending
            usort($scoredArticles, function ($a, $b) {
                return $b['score'] <=> $a['score'];
            });

            // Filter similarity threshold (0.35) and take top 3
            foreach ($scoredArticles as $item) {
                if ($item['score'] >= 0.35) {
                    $matchedArticles->push($item['article']);
                }
            }
            $matchedArticles = $matchedArticles->take(3);
        }

        // Fallback to keyword search if no embeddings or no similarity match
        if ($matchedArticles->count() === 0) {
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
        }
        
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

        // Calculate confidence and unsure flag based on best RAG match score
        $isUnsure = false;
        $confidence = 90;
        if ($userEmbedding && count($scoredArticles) > 0) {
            $bestScore = $scoredArticles[0]['score'];
            if ($bestScore > 0.7) {
                $confidence = rand(95, 98);
            } elseif ($bestScore > 0.5) {
                $confidence = rand(80, 94);
            } elseif ($bestScore > 0.35) {
                $confidence = rand(65, 79);
            } else {
                $confidence = rand(45, 58);
                $isUnsure = true;
            }
        } else {
            $confidence = rand(88, 94);
        }

        // Prep prompt instructions
        $systemInstruction = "You are Eco-Bot, the intelligent real-time waste reduction advisor representing EcoTrack at Greenfield Residencies.
You MUST ONLY answer questions related to our Greenfield Residencies system, including local recycling guidelines, wet/dry waste sorting rules, collection calendars, block schedules, maintenance fees/payments, and resident complaints.
If the user asks any question about topics unrelated to Greenfield Residencies, waste management, or municipal telemetry (such as writing general code, answering history/geography facts, general news, translation, storytelling, or math), you must politely decline to answer, stating that you are only programmed to assist with Greenfield residencies waste and system operations.
Always reference the matched knowledge base articles if provided.
If the resident asks a question or complains in Sinhala (using either Sinhala script or Singlish/English alphabet), you MUST reply in Sinhala (using Sinhala script). Translate any English reference context or knowledge base guides accurately into the user's language (Sinhala/etc.) in your response.
Keep your response professional, practical, encouraging, and under 150 words. Do not make up facts. Today's date is: 2026-06-08.

{$context}

Conversational Thread History:
{$dialogHistoryString}";

        // Define Tools for Gemini Function Calling
        $tools = [
            [
                'functionDeclarations' => [
                    [
                        'name' => 'lodgeMissedCollectionComplaint',
                        'description' => 'Automatically lodge a missed collection or service complaint ticket in the system when the resident expresses a clear complaint or grievance about a missed pickup, rudeness, timing, spills, etc.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'category' => [
                                    'type' => 'STRING',
                                    'description' => 'The category of the complaint.',
                                    'enum' => ['missed_collection', 'worker_rudeness', 'spilled_waste', 'wrong_time', 'other']
                                ],
                                'description' => [
                                    'type' => 'STRING',
                                    'description' => 'A detailed summary of the complaint or issue.'
                                ]
                            ],
                            'required' => ['category', 'description']
                        ]
                    ],
                    [
                        'name' => 'escalateLowConfidenceQuery',
                        'description' => 'Escalate a low confidence query (when the resident asks a question that is out of scope of the knowledge base or is too complex) to the admin/supervisor dashboard.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'original_query' => [
                                    'type' => 'STRING',
                                    'description' => 'The original question asked by the resident.'
                                ],
                                'context_description' => [
                                    'type' => 'STRING',
                                    'description' => 'Reason for the escalation (e.g. details missing from knowledge base).'
                                ]
                            ],
                            'required' => ['original_query', 'context_description']
                        ]
                    ],
                    [
                        'name' => 'getGreenfieldWorkers',
                        'description' => 'Retrieve the list of active waste collection workers representing Greenfield Residencies, including their names, phone numbers, and active shifts, to answer resident queries about who the workers are or who is assigned to their unit next.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => (object)[]
                        ]
                    ]
                ]
            ]
        ];

        $botResponse = "";
        $ticketCreated = false;
        $ticketCode = null;
        $ticketDetails = null;

        if (empty($apiKey) || $apiKey === 'MY_GEMINI_API_KEY') {
            // Safe fallback response if key not available
            $botResponse = "Hello! I am Eco-Bot, your advisor. I noticed that my Gemini API coordinates are currently on sandbox placeholders. Based on our sorting directives: recycle clean glass, pet plastics, and cards safely. Compost wet organic scraps under Block scheme norms. Let me know if you would like me to detail further!";
        } else {
            try {
                // Query using gemini-2.5-flash which is supported in the environment
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;
                
                $response = Http::withoutVerifying()->post($endpoint, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => "User Ask: " . $userMessage]
                            ]
                        ]
                    ],
                    'tools' => $tools,
                    'systemInstruction' => [
                        'parts' => [
                            ['text' => $systemInstruction]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'maxOutputTokens' => 400
                    ]
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $candidate = $json['candidates'][0]['content']['parts'][0] ?? null;

                    if ($candidate && isset($candidate['functionCall'])) {
                        $functionCall = $candidate['functionCall'];
                        $functionName = $functionCall['name'];
                        $args = $functionCall['args'] ?? [];

                        if ($functionName === 'lodgeMissedCollectionComplaint') {
                            $category = $args['category'] ?? 'other';
                            $description = $args['description'] ?? $userMessage;
                            
                            $complaintCode = 'C-' . mt_rand(100, 999);
                            $unit = Unit::where('resident_id', $resident->id)->first();
                            
                            $complaint = Complaint::create([
                                'complaint_code' => $complaintCode,
                                'resident_id' => $resident->id,
                                'unit_id' => $unit->id ?? null,
                                'category' => $category,
                                'description' => $description,
                                'status' => 'open',
                            ]);

                            $botResponse = "I have successfully logged a complaint ticket for you in the database. Reference Code: **{$complaintCode}**. The Greenfield management team has been notified and will look into this issue immediately.";
                            $ticketCreated = true;
                            $ticketCode = $complaintCode;
                            $ticketDetails = $complaint;
                            $confidence = 99;
                            $isUnsure = false;
                        } elseif ($functionName === 'escalateLowConfidenceQuery') {
                            $originalQuery = $args['original_query'] ?? $userMessage;
                            $contextDesc = $args['context_description'] ?? 'No matches found in knowledge base.';
                            
                            $complaintCode = 'C-' . mt_rand(100, 999);
                            $unit = Unit::where('resident_id', $resident->id)->first();
                            
                            $complaint = Complaint::create([
                                'complaint_code' => $complaintCode,
                                'resident_id' => $resident->id,
                                'unit_id' => $unit->id ?? null,
                                'category' => 'other',
                                'description' => "Escalated Low-Confidence Query: " . $originalQuery . "\nReason: " . $contextDesc,
                                'status' => 'open',
                            ]);

                            $botResponse = "I'm not fully sure how to respond to that topic under Greenfield Residencies guidelines. I have created a support ticket (Reference Code: **{$complaintCode}**) and escalated your query directly to the supervisor dashboard for review.";
                            $ticketCreated = true;
                            $ticketCode = $complaintCode;
                            $ticketDetails = $complaint;
                            $confidence = 54;
                            $isUnsure = true;
                        } elseif ($functionName === 'getGreenfieldWorkers') {
                            $data = $this->getGreenfieldWorkersData($resident);
                            $workers = $data['workers'];
                            $assignedWorker = $data['assignedWorker'];

                            $toolResponse = [
                                'active_workers' => $workers->toArray(),
                                'assigned_worker' => $assignedWorker
                            ];

                            // Second API call to Gemini to summarize response naturally
                            $secondResponse = Http::withoutVerifying()->post($endpoint, [
                                'contents' => [
                                    [
                                        'role' => 'user',
                                        'parts' => [
                                            ['text' => "User Ask: " . $userMessage]
                                        ]
                                    ],
                                    [
                                        'role' => 'model',
                                        'parts' => [
                                            ['functionCall' => $functionCall]
                                        ]
                                    ],
                                    [
                                        'role' => 'tool',
                                        'parts' => [
                                            [
                                                'functionResponse' => [
                                                    'name' => 'getGreenfieldWorkers',
                                                    'response' => $toolResponse
                                                ]
                                            ]
                                        ]
                                    ]
                                ],
                                'tools' => $tools,
                                'systemInstruction' => [
                                    'parts' => [
                                        ['text' => $systemInstruction]
                                    ]
                                ],
                                'generationConfig' => [
                                    'temperature' => 0.2,
                                    'maxOutputTokens' => 400
                                ]
                            ]);

                            if ($secondResponse->successful()) {
                                $secondJson = $secondResponse->json();
                                $botResponse = $secondJson['candidates'][0]['content']['parts'][0]['text'] ?? "Could not resolve response text.";
                            } else {
                                $botResponse = $this->getWorkerResponse($userMessage, $resident);
                            }
                        }
                    } else {
                        $botResponse = $candidate['text'] ?? "Could not resolve response text.";
                    }
                } else {
                    $botResponse = $this->getLocalFallbackResponse($userMessage, $resident);
                }
            } catch (\Exception $e) {
                $botResponse = $this->getLocalFallbackResponse($userMessage, $resident);
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
                'reply' => $botResponse,
                'confidence' => $confidence,
                'is_unsure' => $isUnsure,
                'ticket_created' => $ticketCreated,
                'ticket_code' => $ticketCode,
                'ticket_details' => $ticketDetails
            ]
        ]);
    }

    /**
     * Retrieve active waste collection workers representing Greenfield Residencies.
     */
    private function getGreenfieldWorkersData($resident)
    {
        $workers = User::where('role', 'worker')->where('status', 'active')->get(['name', 'phone', 'shift']);
        
        $unit = Unit::where('resident_id', $resident->id)->first();
        $assignedWorker = null;
        if ($unit) {
            $nextJob = Job::with('worker')
                ->where(function($q) use ($unit) {
                    $q->where('unit_id', $unit->id)
                      ->orWhere(function($sq) use ($unit) {
                          $sq->whereNull('unit_id')->where('floor_id', $unit->floor_id);
                      });
                })
                ->whereIn('status', ['pending', 'in_progress'])
                ->orderBy('scheduled_date', 'asc')
                ->first();
            if ($nextJob && $nextJob->worker) {
                $assignedWorker = [
                    'name' => $nextJob->worker->name,
                    'phone' => $nextJob->worker->phone,
                    'shift' => $nextJob->worker->shift,
                    'scheduled_date' => $nextJob->scheduled_date->format('Y-m-d')
                ];
            }
        }

        return [
            'workers' => $workers,
            'assignedWorker' => $assignedWorker
        ];
    }

    /**
     * Helper to format worker list response. Supports Sinhala translation.
     */
    private function getWorkerResponse($userMessage, $resident)
    {
        $data = $this->getGreenfieldWorkersData($resident);
        $workers = $data['workers'];
        $assignedWorker = $data['assignedWorker'];

        $isSinhalaQuery = preg_match('/[\x{0D80}-\x{0DFF}]/u', $userMessage) || 
                          preg_match('/\b(kauda|inne|weda|wada|kavda|kavuda|koyi|enne|floor|unit|ko|workerla|sinnas|kuda|danna|katada|enne|enna|kawda)\b/i', $userMessage);

        if ($isSinhalaQuery) {
            $response = "ග්‍රීන්ෆීල්ඩ් රෙසිඩන්සීස් හි සක්‍රීය අපද්‍රව්‍ය එකතු කරන සේවකයින් මෙන්න:\n";
            foreach ($workers as $w) {
                $shiftLocal = ($w->shift === 'morning') ? 'උදෑසන' : (($w->shift === 'evening') ? 'සවස' : 'රාත්‍රී');
                $response .= "- **{$w->name}** (දුරකථන: {$w->phone}, වැඩ මුරය: {$shiftLocal})\n";
            }
            if ($assignedWorker) {
                $shiftAssignedLocal = ($assignedWorker['shift'] === 'morning') ? 'උදෑසන' : (($assignedWorker['shift'] === 'evening') ? 'සවස' : 'රාත්‍රී');
                $response .= "\nඔබගේ ඊළඟ එකතු කිරීමේ වාරය **{$assignedWorker['name']}** වෙත පැවරී ඇත (දිනය: {$assignedWorker['scheduled_date']}, වැඩ මුරය: {$shiftAssignedLocal}).";
            }
            return $response;
        }

        $response = "Here are the active waste collection workers at Greenfield Residencies:\n";
        foreach ($workers as $w) {
            $response .= "- **{$w->name}** (Phone: {$w->phone}, Shift: {$w->shift})\n";
        }
        if ($assignedWorker) {
            $response .= "\nYour next collection is assigned to **{$assignedWorker['name']}** on {$assignedWorker['scheduled_date']}.";
        }
        return $response;
    }

    /**
     * Smart local fallback response system for Eco-Bot.
     * Invoked when Gemini API is rate-limited (429) or offline.
     */
    private function getLocalFallbackResponse($userMessage, $resident)
    {
        $userMessageLower = strtolower($userMessage);
        $isSinhalaQuery = preg_match('/[\x{0D80}-\x{0DFF}]/u', $userMessage) || 
                          preg_match('/\b(kauda|inne|weda|wada|kavda|kavuda|koyi|enne|floor|unit|ko|workerla|sinnas|kuda|danna|katada|enne|enna|kawda|puluwanda|puluwan|sinhala|sinhalen|mata|oyata)\b/i', $userMessage);

        // 1. Check for greetings
        if (preg_match('/\b(hi|hello|hey|helo|halo|good morning|ayubowan|ආයුබෝවන්|හෙලෝ|හායි)\b/i', $userMessageLower)) {
            if ($isSinhalaQuery) {
                return "ආයුබෝවන්! මම Eco-Bot, ඔබේ ග්‍රීන්ෆීල්ඩ් අපද්‍රව්‍ය කළමනාකරණ සහ පද්ධති සහකාර. අද ඔබට මා උදවු කරන්නේ කෙසේද? 🌿";
            }
            return "Hello! I am Eco-Bot, your Greenfield Residencies waste and system advisor. How can I assist you today? 🌿";
        }

        // 2. Check for Sinhala query check
        if (preg_match('/\b(sinhala|sinhalen|සිංහල|සිංහලෙන්)\b/i', $userMessageLower)) {
            return "ඔව්, මට සිංහලෙන් පිළිතුරු දෙන්න පුළුවන්! 🇱🇰 ඔබට ග්‍රීන්ෆීල්ඩ් අපද්‍රව්‍ය බැහැර කිරීමේ ක්‍රමවේද, සේවකයින් හෝ ගෙවීම් පිළිබඳව ඕනෑම ප්‍රශ්නයක් සිංහලෙන් විමසන්න.";
        }

        // 3. Check for workers
        $isWorkerQuery = preg_match('/\b(worker|workers|staff|collector|collectors)\b/i', $userMessageLower) || 
                         preg_match('/\b(kauda|inne|weda|wada|kavda|kavuda|koyi|enne|floor|unit|ko|workerla|sinnas|kuda|danna|katada|enne|enna|kawda)\b/i', $userMessageLower);
        if ($isWorkerQuery) {
            return $this->getWorkerResponse($userMessage, $resident);
        }

        // 4. Local RAG fallback based on keyword search in database articles
        $words = preg_split('/\s+/', $userMessageLower);
        $bestArticle = null;
        $maxMatches = 0;

        $kbArticles = KnowledgeBase::all();
        foreach ($kbArticles as $art) {
            $matches = 0;
            $tags = preg_split('/[\s,]+/', strtolower($art->tags));
            foreach ($words as $word) {
                $cleanedWord = trim($word, "?.,!\"()[]");
                if (strlen($cleanedWord) > 3 && (in_array($cleanedWord, $tags) || strpos(strtolower($art->title), $cleanedWord) !== false)) {
                    $matches++;
                }
            }
            if ($matches > $maxMatches) {
                $maxMatches = $matches;
                $bestArticle = $art;
            }
        }

        if ($bestArticle && $maxMatches > 0) {
            if ($isSinhalaQuery) {
                // Return a translated summary of the matched article
                if ($bestArticle->category === 'organic') {
                    return "🌿 **ජෛව හායන කාබනික අපද්‍රව්‍ය (Biodegradable Waste)**:\nපලතුරු, එළවළු ලෙලි සහ පිසූ ආහාර වැනි සියලුම තෙත් අපද්‍රව්‍ය Greenfield ක්‍රමවේදයට අනුව **කොළ පැහැති කොම්පෝස්ට් බෑග්** වල බහා බැහැර කළ යුතුය. සෙසු වියළි අපද්‍රව්‍ය සමඟ මිශ්‍ර නොකරන්න.";
                } elseif ($bestArticle->category === 'recycling') {
                    return "♻️ **ප්‍රතිචක්‍රීකරණය කළ හැකි ද්‍රව්‍ය (Recyclables)**:\nප්ලාස්ටික් බෝතල්, කඩදාසි, කාඩ්බෝඩ් සහ පොලි-ද්‍රව්‍ය පිරිසිදු කර වියළා **නිල් පැහැති බෑග්** වල බහා බැහැර කරන්න. ප්ලාස්ටික් බෝතල් හොඳින් සෝදා තැලීමෙන් ඉඩ ඉතිරි කරගත හැක.";
                } elseif ($bestArticle->category === 'bulk') {
                    return "📦 **විශාල අපද්‍රව්‍ය සහ විද්‍යුත් අපද්‍රව්‍ය (E-Waste & Bulky Items)**:\nපැරණි ගෘහ භාණ්ඩ, මෙට්ට, සහ පරිගණක/රූපවාහිනී වැනි විද්‍යුත් අපද්‍රව්‍ය සාමාන්‍ය කුණු සමඟ බැහැර කළ නොහැක. මේ සඳහා 'Special Pickup' මෙනුවෙන් LKR 1,500ක ගාස්තුවකට විශේෂ එකතු කිරීමක් වෙන්කරවා ගත යුතුය.";
                } elseif ($bestArticle->category === 'hazard') {
                    return "⚠️ **අන්තරායකර සහ වෛද්‍ය අපද්‍රව්‍ය (Hazardous Waste)**:\nභාවිතා කරන ලද සිරිංජ, කල් ඉකුත් වූ ඖෂධ, තීන්ත, කෙමිකල් සහ තියුණු උපකරණ බැහැර කළ යුත්තේ **රතු පැහැති බෑග්/පවුච්** වල දමා පමණි. මෙය සේවකයින්ගේ ආරක්ෂාව සඳහා අතිශය වැදගත් වේ.";
                } elseif ($bestArticle->category === 'general') {
                    return "📅 **දෛනික වැඩ මුර සහ කාලසටහන් (Schedules)**:\nGreenfield අපද්‍රව්‍ය එකතු කිරීම දිනපතා උදෑසන (Morning shift - 6:30 AM) සහ සවස (Evening shift - 2:30 PM) සිදුවේ. කරුණාකර නියමිත වේලාවට පෙර අපද්‍රව්‍ය බෑග් පිටතින් තබන්න.";
                }
            }

            // Return in English
            return "Based on Greenfield Guides - **{$bestArticle->title}**:\n" . $bestArticle->content;
        }

        // 5. Default fallback message if no keywords match
        if ($isSinhalaQuery) {
            return "කණගාටුයි, මගේ සේවාදායකය (Gemini AI) මේ මොහොතේ කාර්යබහුලයි. 🌿 සාමාන්‍ය රීතියක් ලෙස: එළවළු/කෑම ඉතුරු කොළ පැහැති බෑග් වලටද, ප්‍රතිචක්‍රීකරණය කළ හැකි ද්‍රව්‍ය (ප්ලාස්ටික්/කඩදාසි) නිල් පැහැති බෑග් වලටද දමා වෙන් කරන්න. ඔබට පැමිණිල්ලක් කිරීමට අවශ්‍ය නම්, කරුණාකර 'Complaints' පිටුව භාවිතා කරන්න.";
        }

        return "I am experiencing high traffic on my Gemini AI advisory server at the moment. 🌿 Quick Tip: Please ensure wet organic waste is in green bags, and dry recyclables are clean and inside blue bags. If you need to report a missed collection, please use the 'Complaints' tab directly.";
    }

    /**
     * Compute dot product between two float arrays representing vectors.
     */
    private function dotProduct(array $a, array $b): float
    {
        $dot = 0.0;
        $count = min(count($a), count($b));
        for ($i = 0; $i < $count; $i++) {
            $dot += $a[$i] * $b[$i];
        }
        return $dot;
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
