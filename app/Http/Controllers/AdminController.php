<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Job;
use App\Models\Block;
use App\Models\Floor;
use App\Models\Unit;
use App\Models\Payment;
use App\Models\Complaint;
use App\Models\Rating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    /**
     * Compile master KPI statistics and real-time dashboard data streams.
     */
    public function dashboard(): JsonResponse
    {
        $today = Carbon::today()->format('Y-m-d');

        // Core KPIs
        $todayJobs = Job::whereDate('scheduled_date', $today)->count();
        $completedToday = Job::whereDate('scheduled_date', $today)->where('status', 'done')->count();
        $issuesToday = Job::whereDate('scheduled_date', $today)->where('status', 'issue')->count();

        $activeResidentsCount = User::where('role', 'resident')->where('status', 'active')->count();

        // Financial KPIs for the current month
        $currentMonth = Carbon::now()->format('F Y'); // e.g. "May 2026"
        $revenueCollected = Payment::where('billing_period', $currentMonth)
            ->where('status', 'paid')
            ->sum('amount');

        // Jobs per day (last 7 days)
        $jobsPerDay = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i)->format('Y-m-d');
            $dayName = Carbon::today()->subDays($i)->format('D');
            
            $jobsMatched = Job::whereDate('scheduled_date', $date)->count();
            $jobsCompleted = Job::whereDate('scheduled_date', $date)->where('status', 'done')->count();

            $jobsPerDay[] = [
                'day' => $dayName,
                'date' => $date,
                'total' => $jobsMatched,
                'completed' => $jobsCompleted,
            ];
        }

        // Status breakdown today
        $statusBreakdown = [
            'done' => Job::whereDate('scheduled_date', $today)->where('status', 'done')->count(),
            'in_progress' => Job::whereDate('scheduled_date', $today)->where('status', 'in_progress')->count(),
            'pending' => Job::whereDate('scheduled_date', $today)->where('status', 'pending')->count(),
            'issue' => Job::whereDate('scheduled_date', $today)->where('status', 'issue')->count(),
        ];

        // Recent activity feed compiled chronologically
        $recentCompletedJobs = Job::with(['worker', 'unit', 'floor.block'])
            ->where('status', 'done')
            ->orderBy('completed_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($job) {
                return [
                    'type' => 'job_completed',
                    'worker_name' => $job->worker->name ?? 'System',
                    'location' => ($job->unit) ? $job->unit->unit_number : ($job->floor ? "Block {$job->floor->block->name} - Floor {$job->floor->floor_number}" : 'Housing Block'),
                    'time_ago' => $job->completed_at ? $job->completed_at->diffForHumans() : 'Just now',
                    'timestamp' => $job->completed_at ? $job->completed_at->timestamp : Carbon::now()->timestamp,
                ];
            });

        $recentIncidents = Job::with(['worker', 'floor.block'])
            ->where('status', 'issue')
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($job) {
                return [
                    'type' => 'incident_reported',
                    'worker_name' => $job->worker->name ?? 'System',
                    'reason' => $job->issue_reason ?? 'Door locked',
                    'location' => "Block {$job->floor->block->name} - Floor {$job->floor->floor_number}",
                    'time_ago' => $job->updated_at->diffForHumans(),
                    'timestamp' => $job->updated_at->timestamp,
                ];
            });

        $recentPayments = Payment::with(['resident', 'unit'])
            ->where('status', 'paid')
            ->orderBy('paid_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($pay) {
                return [
                    'type' => 'payment_received',
                    'resident_name' => $pay->resident->name ?? 'Anonymous',
                    'amount' => $pay->amount,
                    'unit' => $pay->unit->unit_number ?? 'N/A',
                    'time_ago' => $pay->paid_at ? $pay->paid_at->diffForHumans() : 'Recently',
                    'timestamp' => $pay->paid_at ? $pay->paid_at->timestamp : ($pay->created_at ? $pay->created_at->timestamp : Carbon::now()->timestamp),
                ];
            });

        $recentComplaints = Complaint::with(['resident', 'unit'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($c) {
                return [
                    'type' => 'complaint',
                    'resident_name' => $c->resident->name ?? 'Resident',
                    'description' => $c->description,
                    'unit' => $c->unit->unit_number ?? 'N/A',
                    'status' => $c->status,
                    'time_ago' => $c->created_at->diffForHumans(),
                    'timestamp' => $c->created_at->timestamp,
                ];
            });

        $dbActivityLogs = \App\Models\ActivityLog::orderBy('created_at', 'desc')
            ->take(15)
            ->get()
            ->map(function ($log) {
                return [
                    'type' => $log->type,
                    'text' => $log->text,
                    'icon' => $log->icon,
                    'time_ago' => $log->created_at->diffForHumans(),
                    'timestamp' => $log->created_at->timestamp,
                ];
            });

        $activities = collect()
            ->merge($recentCompletedJobs)
            ->merge($recentIncidents)
            ->merge($recentPayments)
            ->merge($recentComplaints)
            ->merge($dbActivityLogs)
            ->sortByDesc('timestamp')
            ->take(15)
            ->values();

        // System Red Flags
        $redFlags = [];
        
        // Flag 1: Overdue payments from residents count
        $overdueCount = Payment::where('status', 'unpaid')->count();
        if ($overdueCount > 0) {
            $totalOverdueSum = Payment::where('status', 'unpaid')->sum('amount');
            $redFlags[] = [
                'type' => 'overdue_payments',
                'title' => "{$overdueCount} overdue payments outstanding",
                'description' => "LKR " . number_format($totalOverdueSum, 2) . " total unpaid balances require active notices.",
            ];
        }

        // Flag 2: Missed collections today/yesterday
        $missedJobsYesterday = Job::whereDate('scheduled_date', Carbon::yesterday()->format('Y-m-d'))
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();
            
        if ($missedJobsYesterday > 0) {
            $redFlags[] = [
                'type' => 'missed_collections',
                'title' => "{$missedJobsYesterday} missed collections yesterday",
                'description' => "Unresolved tasks remain pending from yesterday parameters. Rescheduling required.",
            ];
        }

        // Flag 3: Low performing workers having ratings drops
        $lowPerformers = Rating::where('rating', '<=', 3)
            ->with('worker')
            ->groupBy('worker_id')
            ->selectRaw('worker_id, AVG(rating) as avg_rating')
            ->having('avg_rating', '<', 3.5)
            ->take(3)
            ->get();

        foreach ($lowPerformers as $row) {
            $redFlags[] = [
                'type' => 'low_rating',
                'title' => "Worker {$row->worker->name} rating concern",
                'description' => "Average rating dropped to " . number_format($row->avg_rating, 1) . "★ on recent resident ratings feedback.",
            ];
        }

        // Flag 4: Open resident complaints
        $openComplaintsCount = Complaint::where('status', 'open')->count();
        if ($openComplaintsCount > 0) {
            $redFlags[] = [
                'type' => 'open_complaints',
                'title' => "{$openComplaintsCount} open resident complaints",
                'description' => "Unresolved resident grievances require active intervention and supervisor resolution.",
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'kpis' => [
                    'today_jobs' => $todayJobs,
                    'completed_jobs' => $completedToday,
                    'issues_count' => $issuesToday,
                    'active_residents' => $activeResidentsCount,
                    'revenue_collected_lkr' => $revenueCollected,
                    'billing_period' => $currentMonth
                ],
                'charts' => [
                    'jobs_per_day' => $jobsPerDay,
                    'status_breakdown' => $statusBreakdown,
                ],
                'activity_feed' => $activities,
                'red_flags' => $redFlags
            ]
        ]);
    }

    /**
     * List all registered system users (Residents or Workers) inside the complexes.
     */
    public function getUsers(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Get with relations
        $users = $query->with('units.floor.block')
                       ->orderBy('name', 'asc')
                       ->paginate(50);

        return response()->json([
            'status' => 'success',
            'data' => $users
        ]);
    }

    /**
     * Register or upload a worker or resident user profile.
     *
     * Accepts unit assignment via:
     *   - unit_id (numeric, direct)
     *   - unit_number + optional block (name-based, resolved to unit_id)
     */
    public function createUser(Request $request): JsonResponse
    {
        $email = $request->email;
        $role = $request->role ?: 'resident';

        // ── Resolve unit_id from unit_number if not provided directly ──
        $unitId = $request->unit_id;
        if (!$unitId && $request->has('unit_number') && $request->unit_number) {
            $unitNumber = $request->unit_number; // e.g. "A-101"

            if ($request->has('block') && $request->block) {
                // Resolve via block name → block_id → floors → units
                $block = Block::where('name', $request->block)->first();
                if ($block) {
                    $unit = Unit::whereHas('floor', function ($q) use ($block) {
                        $q->where('block_id', $block->id);
                    })->where('unit_number', $unitNumber)->first();
                    $unitId = $unit ? $unit->id : null;
                }
            }

            // Fallback: search globally by unit_number
            if (!$unitId) {
                $unit = Unit::where('unit_number', $unitNumber)->first();
                $unitId = $unit ? $unit->id : null;
            }
        }

        // Gather all extra details if provided
        $extraData = [];

        // Handle avatar / profile picture upload
        if ($request->has('avatar') && $request->avatar !== null) {
            $avatar = $request->avatar;
            if ($avatar === '') {
                // If explicit empty string, it means user wants to remove photo
                $extraData['profile_photo_path'] = null;
            } elseif (preg_match('/^data:image\/(\w+);base64,/', $avatar, $type)) {
                $base64Data = substr($avatar, strpos($avatar, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, gif, webp, etc.
                if (in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                    $decodedData = base64_decode($base64Data);
                    if ($decodedData !== false) {
                        $filename = 'profile-photos/' . Str::random(40) . '.' . $type;
                        \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $decodedData);
                        $extraData['profile_photo_path'] = $filename;
                    }
                }
            } else {
                // If it is a preset URL or standard path, we save it (or strip /storage/ if present)
                $path = $avatar;
                if (str_starts_with($path, '/storage/')) {
                    $path = substr($path, 9);
                }
                $extraData['profile_photo_path'] = $path;
            }
        }

        $fields = [
            'nic', 'move_in_date', 'occupancy_type',
            'recycling_plan', 'emergency_contact_name', 'emergency_contact_phone', 'notes', 'language'
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $extraData[$field] = $request->input($field);
            }
        }

        if ($request->has('whatsapp_enabled')) {
            $extraData['whatsapp_enabled'] = filter_var($request->input('whatsapp_enabled'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('assistance_required')) {
            $extraData['assistance_required'] = filter_var($request->input('assistance_required'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('household_members')) {
            $extraData['household_members'] = (int) $request->input('household_members');
        }

        // Check if user with this email already exists
        $user = User::where('email', $email)->first();

        if ($user) {
            // Update existing user instead of failing on unique validation
            $updateFields = array_merge([
                'name' => $request->name ?: $user->name,
                'phone' => $request->phone ?: $user->phone,
                'role' => $role,
                'shift' => $role === 'worker' ? ($request->shift ?: $user->shift) : null,
            ], $extraData);

            $user->update($updateFields);

            // Auto assign unit relationship if standard resident role
            if ($user->role === 'resident' && $unitId) {
                // First, unlink this user from any previously assigned units
                Unit::where('resident_id', $user->id)->update(['resident_id' => null]);
                // Then assign the new unit
                $unit = Unit::find($unitId);
                if ($unit) {
                    $unit->update([
                        'resident_id' => $user->id,
                    ]);
                }
            }

            \App\Models\ActivityLog::create([
                'type' => 'resident',
                'text' => "Modified profile for {$role}: {$user->name}",
                'icon' => 'resident'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => ucfirst($user->role) . ' profile updated and synchronized successfully.',
                'data' => $user->load('units')
            ], 200);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,worker,resident',
            'shift' => 'nullable|in:morning,evening,night',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $createFields = array_merge([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'shift' => $request->role === 'worker' ? $request->shift : null,
            'status' => 'active',
        ], $extraData);

        $user = User::create($createFields);

        // Auto assign unit relationship if standard resident role
        if ($user->role === 'resident' && $unitId) {
            $unit = Unit::find($unitId);
            if ($unit) {
                $unit->update([
                    'resident_id' => $user->id,
                ]);
            }
        }

        \App\Models\ActivityLog::create([
            'type' => 'resident',
            'text' => "Onboarded new {$user->role} profile: {$user->name}",
            'icon' => 'resident'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => ucfirst($user->role) . ' created and configured successfully.',
            'data' => $user->load('units')
        ], 201);
    }

    /**
     * Deactivate or drop system user accounts safely.
     */
    public function deleteUser(User $user): JsonResponse
    {
        // Unbind any units associated if resident is dropped
        if ($user->role === 'resident') {
            Unit::where('resident_id', $user->id)->update(['resident_id' => null]);
        }

        $userName = $user->name;
        $userRole = $user->role;
        $user->delete();

        \App\Models\ActivityLog::create([
            'type' => 'resident',
            'text' => "Permanently deleted {$userRole} profile: {$userName}",
            'icon' => 'resident'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User profile successfully dissolved.'
        ]);
    }

    /**
     * List all housing structure QR code indices.
     */
    public function listQRCodes(): JsonResponse
    {
        $floors = Floor::with('block')->get()->map(function($floor) {
            return [
                'type' => 'floor',
                'id' => $floor->id,
                'title' => "Block {$floor->block->name} - Floor {$floor->floor_number}",
                'qr_hash' => $floor->qr_code_hash,
                'scans_link' => asset("api/verify-qr?hash={$floor->qr_code_hash}"),
            ];
        });

        $units = Unit::with('floor.block')->whereNotNull('qr_code_hash')->get()->map(function($unit) {
            return [
                'type' => 'unit',
                'id' => $unit->id,
                'title' => "Unit {$unit->unit_number} (Block {$unit->floor->block->name}, Floor {$unit->floor->floor_number})",
                'qr_hash' => $unit->qr_code_hash,
                'scans_link' => asset("api/verify-qr?hash={$unit->qr_code_hash}"),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $floors->merge($units)
        ]);
    }

    /**
     * Generate or download QR codes representation data.
     */
    public function generateQRCode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:floor,unit',
            'id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $qr_hash = Str::random(12);

        if ($request->type === 'floor') {
            $floor = Floor::find($request->id);
            if ($floor) {
                $floor->update(['qr_code_hash' => $qr_hash]);
            }
        } else {
            $unit = Unit::find($request->id);
            if ($unit) {
                $unit->update(['qr_code_hash' => $qr_hash]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'QR Code hash randomized and refreshed.',
            'data' => [
                'qr_hash' => $qr_hash,
                'scans_preview' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode($qr_hash)
            ]
        ]);
    }

    /**
     * List structural payment billing histories and details.
     */
    public function payments(Request $request): JsonResponse
    {
        $query = Payment::with(['resident', 'unit']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('payment_type', $request->type);
        }

        $payments = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $payments
        ]);
    }

    /**
     * Process dynamic bulk generation of monthly utility maintenance bills for residents.
     */
    public function generateMonthlyBills(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'billing_period' => 'required|string', // e.g. "May 2026"
            'amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $residents = User::where('role', 'resident')->where('status', 'active')->get();
        $generatedCount = 0;

        foreach ($residents as $resident) {
            $unit = Unit::where('resident_id', $resident->id)->first();
            
            // Check if user is already billed for this block cycle
            $exists = Payment::where('resident_id', $resident->id)
                ->where('billing_period', $request->billing_period)
                ->where('payment_type', 'monthly_fee')
                ->exists();

            if ($exists) {
                continue;
            }

            $refCode = sprintf('EC-%s-%s', Carbon::now()->format('Y-m'), Str::upper(Str::random(5)));

            Payment::create([
                'resident_id' => $resident->id,
                'unit_id' => $unit->id ?? null,
                'amount' => $request->amount,
                'status' => 'unpaid',
                'payment_type' => 'monthly_fee',
                'reference_code' => $refCode,
                'billing_period' => $request->billing_period,
                'notes' => 'Fixed standard waste service monthly maintenance charge.',
            ]);

            $generatedCount++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully posted {$generatedCount} bills onto resident accounts for {$request->billing_period}."
        ]);
    }

    /**
     * Mark a resident payment invoice as settled via cash or manual cheque.
     */
    public function markPaymentPaid(Request $request, $id): JsonResponse
    {
        $payment = Payment::find($id);

        if (!$payment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Payment invoice record not found.'
            ], 404);
        }

        if ($payment->status === 'paid') {
            return response()->json([
                'status' => 'error',
                'message' => 'This payment invoice is already fully cleared.'
            ], 422);
        }

        $payment->update([
            'status' => 'paid',
            'payment_method' => $request->payment_method ?? 'cash',
            'paid_at' => Carbon::now(),
            'transaction_id' => 'TXN-' . Str::upper(Str::random(10)),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Payment invoice marked as paid successfully.',
            'data' => $payment
        ]);
    }

    /**
     * Permanently remove a payment invoice from the system.
     */
    public function deletePayment($id): JsonResponse
    {
        $payment = Payment::find($id);

        if (!$payment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Payment invoice record not found.'
            ], 404);
        }

        $payment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Payment invoice record deleted successfully.'
        ]);
    }

    /**
     * Read or view complaint logs.
     */
    public function complaints(Request $request): JsonResponse
    {
        $query = Complaint::with(['resident', 'unit', 'job.worker']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $complaints = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $complaints
        ]);
    }

    /**
     * Record dynamic administrative resolution logs detailing complaint closure actions.
     */
    public function resolveComplaint(Request $request, $id): JsonResponse
    {
        $complaint = Complaint::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'internal_notes' => 'required|string|min:5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Must supply internal resolution details',
                'errors' => $validator->errors()
            ], 422);
        }

        $complaint->update([
            'status' => 'resolved',
            'internal_notes' => $request->internal_notes,
            'resolved_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Complaint successfully resolved and archived.",
            'data' => $complaint
        ]);
    }

    public function deleteComplaint($id): JsonResponse
    {
        $complaint = Complaint::findOrFail($id);
        $complaint->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Complaint successfully deleted.'
        ]);
    }


    /**
     * Analytical PDF export simulation representing Monthly Metrics summary profiles.
     */
    public function monthlyReport(Request $request): JsonResponse
    {
        $currentPeriod = $request->billing_period ?? Carbon::now()->format('F Y');

        $totalJobs = Job::whereMonth('scheduled_date', Carbon::now()->month)->count();
        $completionRate = $totalJobs > 0 ? (Job::whereMonth('scheduled_date', Carbon::now()->month)->where('status', 'done')->count() / $totalJobs) * 100 : 94;

        $revenue = Payment::where('billing_period', $currentPeriod)->where('status', 'paid')->sum('amount');
        $complaintsCount = Complaint::whereMonth('created_at', Carbon::now()->month)->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'title' => "Monthly EcoTrack Operations Metrics - {$currentPeriod}",
                'date_generated' => Carbon::now()->toDateTimeString(),
                'metric_summary' => [
                    'billing_period' => $currentPeriod,
                    'total_operational_jobs' => $totalJobs,
                    'completion_rate_percentage' => number_format($completionRate, 1) . "%",
                    'revenue_collected_lkr' => "LKR " . number_format($revenue, 2),
                    'incoming_resident_complaints' => $complaintsCount,
                ],
                'visual_preview_url' => asset("reports/mock-download")
            ]
        ]);
    }

    /**
     * Output comparative rating matrices and collection trends for worker performance reports.
     */
    public function workerPerformanceReport(): JsonResponse
    {
        $workers = User::where('role', 'worker')->get()->map(function($worker) {
            $totalAssigned = Job::where('worker_id', $worker->id)->count();
            $totalCompleted = Job::where('worker_id', $worker->id)->where('status', 'done')->count();
            $completionRate = $totalAssigned > 0 ? ($totalCompleted / $totalAssigned) * 100 : 100;

            $avgRating = Rating::where('worker_id', $worker->id)->avg('rating') ?? 5.0;

            $recentFeedback = Rating::where('worker_id', $worker->id)
                ->orderBy('created_at', 'desc')
                ->take(2)
                ->pluck('feedback')
                ->filter();

            return [
                'worker_id' => $worker->id,
                'name' => $worker->name,
                'email' => $worker->email,
                'shift' => $worker->shift,
                'stats' => [
                    'rating' => number_format($avgRating, 1),
                    'total_assigned_tasks' => $totalAssigned,
                    'completion_efficiency' => number_format($completionRate, 1) . "%",
                    'recent_remarks' => $recentFeedback->values()
                ]
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $workers
        ]);
    }
}
