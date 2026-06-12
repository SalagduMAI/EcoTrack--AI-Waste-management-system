<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\JobAudit;
use App\Models\Unit;
use App\Models\Floor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class WorkerController extends Controller
{
    /**
     * Retrieve today's tasks representing the worker's specific shift (Morning, Evening, or Night).
     */
    public function todayTasks(Request $request): JsonResponse
    {
        $worker = $request->user();
        $todayStr = Carbon::today()->format('Y-m-d');

        // Look up tasks scheduled for today and matched to worker shift
        $tasks = Job::with(['block', 'floor', 'unit'])
            ->where('worker_id', $worker->id)
            ->whereDate('scheduled_date', $todayStr)
            ->where('shift', $worker->shift ?? 'morning')
            ->orderBy('status', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'worker' => [
                    'name' => $worker->name,
                    'shift' => $worker->shift,
                ],
                'date' => $todayStr,
                'tasks' => $tasks
            ]
        ]);
    }

    /**
     * Mark a scheduled task as In-Progress.
     */
    public function markInProgress(Request $request, $id): JsonResponse
    {
        $worker = $request->user();
        $job = Job::where('worker_id', $worker->id)->findOrFail($id);

        if (!in_array($job->status, ['pending', 'issue'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Task is already processed or completed. Current status: ' . $job->status
            ], 400);
        }

        $job->update([
            'status' => 'in_progress'
        ]);

        // Log audit trace signature
        JobAudit::create([
            'job_id' => $job->id,
            'worker_id' => $worker->id,
            'action' => 'STATUS_MARKED_IN_PROGRESS',
            'lat' => $request->lat,
            'lng' => $request->lng,
            'timed_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Task marked as In-Progress.',
            'data' => $job->load(['block', 'floor', 'unit'])
        ]);
    }

    /**
     * Scan QR code and verify to unlock "Mark Done" status transition.
     * CRITICAL CORE WORKFLOW RULE: Status can only match 'done' if scanned hash matches the target housing structure!
     */
    public function scanVerifyAndDone(Request $request, $id): JsonResponse
    {
        $worker = $request->user();
        $job = Job::with(['unit', 'floor'])->where('worker_id', $worker->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'scanned_qr_hash' => 'required|string',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Must supply scanned QR hash parameters.',
                'errors' => $validator->errors()
            ], 422);
        }

        $scannedHash = $request->scanned_qr_hash;
        
        // Resolve structural target expected QR hash code
        $expectedHash = null;
        if ($job->unit_id && $job->unit) {
            $expectedHash = $job->unit->qr_code_hash;
        } elseif ($job->floor_id && $job->floor) {
            $expectedHash = $job->floor->qr_code_hash;
        }

        // Validate QR credentials match exactly
        if (!$expectedHash || $expectedHash !== $scannedHash) {
            return response()->json([
                'status' => 'error',
                'message' => 'Verification failed. Scanned QR code does not match this unit\'s structure code.'
            ], 422);
        }

        // Successfully matched! Update task status to done
        $job->update([
            'status' => 'done',
            'scanned_at' => Carbon::now(),
            'completed_at' => Carbon::now(),
            'issue_reason' => null
        ]);

        // Commit auditable trace logs including hardware signature
        JobAudit::create([
            'job_id' => $job->id,
            'worker_id' => $worker->id,
            'scanned_qr_hash' => $scannedHash,
            'action' => 'QR_SCANNED_OK',
            'lat' => $request->lat,
            'lng' => $request->lng,
            'timed_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'QR code validated. Task marked as Done.',
            'data' => $job->load(['block', 'floor', 'unit'])
        ]);
    }

    /**
     * Report an incident or exceptional issue preventing routine collection.
     */
    public function reportIncident(Request $request, $id): JsonResponse
    {
        $worker = $request->user();
        $job = Job::where('worker_id', $worker->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|min:5',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240', // Max 10MB
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('incidents', 'public');
        }

        $job->update([
            'status' => 'issue',
            'issue_reason' => $request->reason,
            'incident_photo_path' => $photoPath,
        ]);

        JobAudit::create([
            'job_id' => $job->id,
            'worker_id' => $worker->id,
            'action' => 'INCIDENT_REPORTED',
            'lat' => $request->lat,
            'lng' => $request->lng,
            'timed_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident reported. Block scheme manager notified.',
            'data' => $job->load(['block', 'floor', 'unit'])
        ]);
    }

    /**
     * Fetch standard collection history logs completed by this worker.
     */
    public function collectionHistory(Request $request): JsonResponse
    {
        $worker = $request->user();

        $history = Job::with(['block', 'floor', 'unit', 'rating'])
            ->where('worker_id', $worker->id)
            ->whereIn('status', ['done', 'issue'])
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);

        return response()->json([
            'status' => 'success',
            'data' => $history
        ]);
    }

    /**
     * Synchronize offline IndexedDB queued transactions during signal-dead zone pickups.
     * Acts as our major chronological sync endpoint.
     */
    public function syncQueue(Request $request): JsonResponse
    {
        $worker = $request->user();

        $validator = Validator::make($request->all(), [
            'queue' => 'required|array',
            'queue.*.job_id' => 'required|exists:jobs,id',
            'queue.*.action' => 'required|string',
            'queue.*.scanned_qr_hash' => 'nullable|string',
            'queue.*.lat' => 'nullable|numeric',
            'queue.*.lng' => 'nullable|numeric',
            'queue.*.device_metadata' => 'nullable|array',
            'queue.*.timed_at' => 'required|date',
            'queue.*.incident_reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sync queue payload verification failed.',
                'errors' => $validator->errors()
            ], 422);
        }

        $processedCount = 0;
        $failedSyncLog = [];

        // Chronologically sort queue actions to process items in original sequence
        $queue = collect($request->queue)->sortBy('timed_at');

        foreach ($queue as $item) {
            $jobId = $item['job_id'];
            $action = $item['action'];
            $timedAt = Carbon::parse($item['timed_at']);

            $job = Job::with(['unit', 'floor'])->find($jobId);

            if (!$job || $job->worker_id != $worker->id) {
                $failedSyncLog[] = [
                    'job_id' => $jobId,
                    'error' => 'Job not scheduled or mismatched worker allocation ID.'
                ];
                continue;
            }

            // Process based on chronological action codes
            if ($action === 'STATUS_MARKED_IN_PROGRESS') {
                $job->update(['status' => 'in_progress']);
                $processedCount++;
            } 
            elseif ($action === 'STATUS_MARKED_DONE') {
                // Verify physical QR match logic before updating status from offline records
                $scannedHash = $item['scanned_qr_hash'] ?? null;
                $expectedHash = $job->unit ? $job->unit->qr_code_hash : ($job->floor ? $job->floor->qr_code_hash : null);

                if (!$expectedHash || $expectedHash !== $scannedHash) {
                    $failedSyncLog[] = [
                        'job_id' => $jobId,
                        'error' => 'QR validation failed on sync. Got: ' . ($scannedHash ?? 'NULL') . ', expected: ' . ($expectedHash ?? 'NULL')
                    ];
                    continue;
                }

                $job->update([
                    'status' => 'done',
                    'scanned_at' => $timedAt,
                    'completed_at' => $timedAt,
                    'issue_reason' => null
                ]);
                $processedCount++;
            } 
            elseif ($action === 'INCIDENT_REPORTED') {
                $job->update([
                    'status' => 'issue',
                    'issue_reason' => $item['incident_reason'] ?? 'Door locked',
                ]);
                $processedCount++;
            }

            // Create historic auditable log entry for reports
            JobAudit::create([
                'job_id' => $job->id,
                'worker_id' => $worker->id,
                'scanned_qr_hash' => $item['scanned_qr_hash'] ?? null,
                'lat' => $item['lat'] ?? null,
                'lng' => $item['lng'] ?? null,
                'action' => $action . '_OFFLINE_PLAYBACK',
                'device_metadata' => $item['device_metadata'] ?? null,
                'timed_at' => $timedAt,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully synchronized offline ledger queue entries chronologically.",
            'data' => [
                'synchronized_count' => $processedCount,
                'failures' => $failedSyncLog
            ]
        ], 200);
    }

    /**
     * Retrieve dashboard telemetry metrics, leaderboard, recent feedback, and notifications.
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $worker = $request->user();

        // 1. CALCULATE WORKER PERFORMANCE METRICS
        $totalJobs = Job::where('worker_id', $worker->id)->count();
        $doneJobs = Job::where('worker_id', $worker->id)->where('status', 'done')->count();
        $issueJobs = Job::where('worker_id', $worker->id)->where('status', 'issue')->count();

        $onTimePct = null;
        if ($doneJobs + $issueJobs > 0) {
            $onTimePct = (int) round(($doneJobs / ($doneJobs + $issueJobs)) * 100);
        } else {
            $onTimePct = 100;
        }

        $avgRatingVal = \App\Models\Rating::where('worker_id', $worker->id)->avg('rating');
        $avgRating = $avgRatingVal !== null ? round($avgRatingVal, 1) : 0.0;
        $ratingCount = \App\Models\Rating::where('worker_id', $worker->id)->count();

        $ecoScore = 0.0;
        if ($avgRating > 0) {
            $ecoScore = $avgRating >= 4.8 ? 5.0 : round(4.0 + ($avgRating * 0.2), 1);
        }

        $todayStr = Carbon::today()->format('Y-m-d');
        $todayJobsDoneCount = Job::where('worker_id', $worker->id)
            ->whereDate('scheduled_date', $todayStr)
            ->where('status', 'done')
            ->count();
        $distanceToday = round($todayJobsDoneCount * 0.15, 1);

        // 2. CONSTRUCT LEADERBOARD STATS
        $workers = \App\Models\User::where('role', 'worker')->get();
        $leaderboard = $workers->map(function ($w) use ($worker) {
            $completedCount = Job::where('worker_id', $w->id)->where('status', 'done')->count();
            $avgWRatingVal = \App\Models\Rating::where('worker_id', $w->id)->avg('rating');
            $avgWRating = $avgWRatingVal !== null ? round($avgWRatingVal, 1) : 0.0;
            
            // Generate initials
            $names = explode(' ', $w->name);
            $initials = '';
            foreach ($names as $n) {
                $initials .= substr($n, 0, 1);
            }
            $initials = strtoupper(substr($initials, 0, 2));

            return [
                'id' => $w->id,
                'name' => $w->name,
                'initials' => $initials ?: 'W',
                'completed_jobs' => $completedCount,
                'rating' => $avgWRating,
                'is_current' => $w->id === $worker->id
            ];
        })->sortByDesc('completed_jobs')->values();

        $rankedLeaderboard = [];
        $rank = 1;
        foreach ($leaderboard as $item) {
            $item['rank'] = $rank++;
            $rankedLeaderboard[] = $item;
        }

        // 3. FETCH RECENT RESIDENT FEEDBACK
        $feedback = \App\Models\Rating::with(['resident', 'job.unit'])
            ->where('worker_id', $worker->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($r) {
                $resNames = explode(' ', $r->resident->name ?? 'Resident');
                $resInitials = '';
                foreach ($resNames as $n) {
                    $resInitials .= substr($n, 0, 1);
                }
                $resInitials = strtoupper(substr($resInitials, 0, 2));

                return [
                    'id' => $r->id,
                    'feedback' => $r->feedback ?: '',
                    'rating' => $r->rating,
                    'resident_name' => $r->resident->name ?? 'Resident',
                    'resident_initials' => $resInitials ?: 'R',
                    'unit_number' => $r->job && $r->job->unit ? $r->job->unit->unit_number : 'N/A',
                    'time_ago' => $r->created_at ? $r->created_at->diffForHumans() : ''
                ];
            });

        // 4. COMPILE WORKER SPECIFIC NOTIFICATIONS
        $ratingNotifications = \App\Models\Rating::with(['resident', 'job.unit'])
            ->where('worker_id', $worker->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($r) {
                return [
                    'id' => 'rating_' . $r->id,
                    'type' => 'rating',
                    'title' => 'New Resident Feedback',
                    'message' => ($r->resident->name ?? 'Resident') . ' rated your service ' . $r->rating . ' ★: "' . ($r->feedback ?: 'Great job!') . '"',
                    'time' => $r->created_at ? $r->created_at->diffForHumans() : '2 days ago',
                    'read' => false
                ];
            });

        $incidentNotifications = Job::with(['block', 'floor', 'unit'])
            ->where('worker_id', $worker->id)
            ->where('status', 'issue')
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($j) {
                return [
                    'id' => 'incident_' . $j->id,
                    'type' => 'incident',
                    'title' => 'Incident Logged',
                    'message' => 'Skipped ' . ($j->unit->unit_number ?? 'Floor ' . $j->floor->floor_number) . ' due to: ' . ($j->issue_reason ?: 'Unknown issue'),
                    'time' => $j->updated_at ? $j->updated_at->diffForHumans() : '1 hour ago',
                    'read' => false
                ];
            });

        $announcements = [
            [
                'id' => 'announcement_1',
                'type' => 'announcement',
                'title' => 'System schedule update',
                'message' => 'Your shift schedule is active. Morning operations are standard today.',
                'time' => '1 day ago',
                'read' => false
            ],
            [
                'id' => 'announcement_2',
                'type' => 'announcement',
                'title' => 'Heavy Rain Precaution',
                'message' => 'Weather alert for Colombo region: high precipitation. Wear high-visibility gear.',
                'time' => '3 days ago',
                'read' => false
            ]
        ];

        $allNotifications = collect($ratingNotifications)
            ->merge($incidentNotifications)
            ->merge($announcements)
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'metrics' => [
                    'on_time_pct' => (int) $onTimePct,
                    'avg_rating' => (float) round($avgRating, 1),
                    'rating_count' => (int) $ratingCount,
                    'eco_score' => (float) $ecoScore,
                    'distance_today' => (float) $distanceToday,
                ],
                'leaderboard' => $rankedLeaderboard,
                'feedback' => $feedback,
                'notifications' => $allNotifications
            ]
        ]);
    }
}
