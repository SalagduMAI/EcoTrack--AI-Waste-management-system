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
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072', // Max 3MB
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
}
