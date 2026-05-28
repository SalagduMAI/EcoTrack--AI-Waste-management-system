<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Unit;
use App\Models\User;
use App\Models\Job;
use Carbon\Carbon;

class GenerateRoutineJobs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ecotrack:schedule-jobs {--date= : Custom scheduling date (Y-m-d)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically schedule routine floor collections for tomorrow and balance allocations to active workers';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dateStr = $this->option('date') ?: Carbon::tomorrow()->format('Y-m-d');
        $targetDate = Carbon::parse($dateStr);

        $this->info("Starting routing scheduler for: " . $targetDate->format('Y-m-d'));

        // Identify all units that require standard routing
        $units = Unit::with('floor.block')->get();
        if ($units->isEmpty()) {
            $this->warn("No high-rise units registered. Aborting.");
            return 0;
        }

        // Active workers available for allocation
        $workers = User::where('role', 'worker')->where('status', 'active')->get();
        if ($workers->isEmpty()) {
            $this->error("Warning: No active waste collection workers registered. Allocations will be left unassigned.");
        }

        $jobsCreatedCount = 0;
        $workerIndex = 0;

        foreach ($units as $unit) {
            $floor = $unit->floor;
            if (!$floor) continue;

            // Check if a job already exists for this unit on this date to prevent duplicates
            $exists = Job::where('unit_id', $unit->id)
                ->whereDate('scheduled_date', $targetDate)
                ->exists();

            if ($exists) {
                continue;
            }

            // Allocate a worker in a round-robin style if workers exist
            $assignedWorker = null;
            if ($workers->isNotEmpty()) {
                $assignedWorker = $workers[$workerIndex % $workers->count()];
                $workerIndex++;
            }

            // Create collection job
            Job::create([
                'worker_id' => $assignedWorker ? $assignedWorker->id : null,
                'block_id' => $floor->block_id,
                'floor_id' => $floor->id,
                'unit_id' => $unit->id,
                'scheduled_date' => $targetDate,
                'shift' => $assignedWorker ? $assignedWorker->shift : 'morning',
                'status' => 'pending',
                'issue_reason' => 'Automated routine service schedule routing.'
            ]);

            $jobsCreatedCount++;
        }

        $this->info("Completed successfully! Generated {$jobsCreatedCount} tasks for date {$dateStr}.");
        return 0;
    }
}
