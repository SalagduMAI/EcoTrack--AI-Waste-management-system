<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\Block;
use App\Models\Floor;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class JobController extends Controller
{
    /**
     * List jobs with query categorization.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Job::with(['worker', 'block', 'floor', 'unit']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('worker_id')) {
            $query->where('worker_id', $request->worker_id);
        }

        if ($request->has('date')) {
            $query->whereDate('scheduled_date', $request->date);
        }

        $jobs = $query->orderBy('scheduled_date', 'asc')
                      ->orderBy('shift', 'asc')
                      ->get();

        return response()->json([
            'status' => 'success',
            'data' => $jobs
        ]);
    }

    /**
     * Create single custom collection job task.
     *
     * Accepts BOTH formats:
     *   - Direct IDs:  worker_id, block_id, floor_id, unit_id, scheduled_date, shift
     *   - Name-based:  worker, block, floor, unit_number, date, shift (resolved to IDs)
     */
    public function store(Request $request): JsonResponse
    {
        // ── Resolve name-based fields to database IDs ──

        // Block: accept "Block A" or block_id
        $blockId = $request->block_id;
        if (!$blockId && $request->has('block')) {
            $blockName = $request->block; // e.g. "Block A"
            $block = Block::where('name', $blockName)->first();
            if (!$block) {
                // Try extracting just the letter, e.g. "A" from "Block A"
                $letter = trim(str_replace('Block', '', $blockName));
                $block = Block::where('name', 'like', "%{$letter}%")->first();
            }
            $blockId = $block ? $block->id : null;
        }

        // Floor: accept "Floor 3" or floor_id
        $floorId = $request->floor_id;
        if (!$floorId && $request->has('floor') && $blockId) {
            $floorInput = $request->floor; // e.g. "Floor 3" or "3"
            $floorNumber = (int) preg_replace('/[^0-9]/', '', $floorInput);
            $floor = Floor::where('block_id', $blockId)
                          ->where('floor_number', $floorNumber)
                          ->first();
            $floorId = $floor ? $floor->id : null;
        }

        // Unit: accept "A-301" or unit_id
        $unitId = $request->unit_id;
        if (!$unitId && $request->has('unit_number') && $floorId) {
            $unit = Unit::where('floor_id', $floorId)
                        ->where('unit_number', $request->unit_number)
                        ->first();
            // If not found on floor, try block-wide
            if (!$unit && $blockId) {
                $unit = Unit::whereHas('floor', function ($q) use ($blockId) {
                    $q->where('block_id', $blockId);
                })->where('unit_number', $request->unit_number)->first();
            }
            $unitId = $unit ? $unit->id : null;
        }

        // Worker: accept "Sunil Kumara" or worker_id
        $workerId = $request->worker_id;
        if (!$workerId && $request->has('worker')) {
            $workerName = $request->worker; // e.g. "Sunil Kumara"
            $worker = \App\Models\User::where('role', 'worker')
                                       ->where('name', $workerName)
                                       ->first();
            // Fallback: partial match
            if (!$worker) {
                $worker = \App\Models\User::where('role', 'worker')
                                           ->where('name', 'like', "%{$workerName}%")
                                           ->first();
            }
            // Fallback: any worker
            if (!$worker) {
                $worker = \App\Models\User::where('role', 'worker')->first();
            }
            $workerId = $worker ? $worker->id : null;
        }

        // Shift: normalize "Morning 6AM-2PM" → "morning"
        $shift = $request->shift;
        if ($shift) {
            $shiftLower = strtolower($shift);
            if (str_contains($shiftLower, 'morning')) {
                $shift = 'morning';
            } elseif (str_contains($shiftLower, 'evening') || str_contains($shiftLower, 'afternoon')) {
                $shift = 'evening';
            } elseif (str_contains($shiftLower, 'night')) {
                $shift = 'night';
            }
            // Ensure it's one of the valid enum values
            if (!in_array($shift, ['morning', 'evening', 'night'])) {
                $shift = 'morning'; // safe default
            }
        }

        // Date: accept "date" or "scheduled_date"
        $scheduledDate = $request->scheduled_date ?: $request->date;

        // ── Validate resolved values ──
        $errors = [];
        if (!$workerId) $errors['worker'] = ['Could not resolve worker. Please check the worker name.'];
        if (!$blockId) $errors['block'] = ['Could not resolve block. Please check the block name.'];
        if (!$floorId) $errors['floor'] = ['Could not resolve floor. Please check the floor name.'];
        if (!$scheduledDate) $errors['date'] = ['Scheduled date is required.'];
        if (!$shift) $errors['shift'] = ['Shift is required.'];

        if (!empty($errors)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Could not resolve some fields to database records.',
                'errors' => $errors,
                'debug' => [
                    'received' => $request->all(),
                    'resolved' => compact('workerId', 'blockId', 'floorId', 'unitId', 'scheduledDate', 'shift'),
                ]
            ], 422);
        }

        $job = Job::create([
            'worker_id' => $workerId,
            'block_id' => $blockId,
            'floor_id' => $floorId,
            'unit_id' => $unitId,
            'scheduled_date' => $scheduledDate,
            'shift' => $shift,
            'status' => 'pending',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Collection task scheduled successfully.',
            'data' => $job->load(['worker', 'block', 'floor', 'unit'])
        ], 201);
    }

    /**
     * View task item status metrics.
     */
    public function show(Job $job): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $job->load(['worker', 'block', 'floor', 'unit', 'audits', 'rating'])
        ]);
    }

    /**
     * Update task assignment or options.
     */
    public function update(Request $request, Job $job): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'worker_id' => 'sometimes|required|exists:users,id',
            'status' => 'sometimes|required|in:pending,in_progress,done,issue',
            'issue_reason' => 'nullable|string',
            'scheduled_date' => 'sometimes|required|date',
            'shift' => 'sometimes|required|in:morning,evening,night',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $job->update($request->only([
            'worker_id',
            'status',
            'issue_reason',
            'scheduled_date',
            'shift',
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Task schedule modified successfully.',
            'data' => $job->load(['worker', 'block', 'floor', 'unit'])
        ]);
    }

    /**
     * Cancel or delete a job task.
     */
    public function destroy(Job $job): JsonResponse
    {
        $job->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Collection task removed from schedule database.'
        ]);
    }

    /**
     * Handle bulk scheduling routines across multiple apartments or floor blocks.
     */
    public function bulkCreate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'worker_id' => 'required|exists:users,id',
            'block_id' => 'required|exists:blocks,id',
            'floors' => 'required|array', // e.g. [1, 2, 3] floor ids
            'scheduled_date' => 'required|date',
            'shift' => 'required|in:morning,evening,night',
            'per_unit' => 'required|boolean', // If true, make jobs for individual units on those floors. If false, make floor-wide jobs.
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $createdCount = 0;
        $scheduledDate = Carbon::parse($request->scheduled_date)->format('Y-m-d');

        foreach ($request->floors as $floorId) {
            $floor = Floor::find($floorId);
            if (!$floor || $floor->block_id != $request->block_id) {
                continue;
            }

            if ($request->per_unit) {
                $units = Unit::where('floor_id', $floorId)->get();
                foreach ($units as $unit) {
                    Job::create([
                        'worker_id' => $request->worker_id,
                        'block_id' => $request->block_id,
                        'floor_id' => $floorId,
                        'unit_id' => $unit->id,
                        'scheduled_date' => $scheduledDate,
                        'shift' => $request->shift,
                        'status' => 'pending',
                    ]);
                    $createdCount++;
                }
            } else {
                Job::create([
                    'worker_id' => $request->worker_id,
                    'block_id' => $request->block_id,
                    'floor_id' => $floorId,
                    'unit_id' => null, // floor-wide general unit collection
                    'scheduled_date' => $scheduledDate,
                    'shift' => $request->shift,
                    'status' => 'pending',
                ]);
                $createdCount++;
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully bootstrapped and dispatched {$createdCount} routine jobs into the workflow."
        ], 201);
    }
}
