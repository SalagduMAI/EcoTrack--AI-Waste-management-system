<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Job;
use App\Models\JobAudit;
use App\Models\Floor;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;

class JobAndAuditSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $today = Carbon::parse('2026-05-20');
        $yesterday = $today->copy()->subDay();
        $tomorrow = $today->copy()->addDay();

        // Retrieve workers to allocate jobs
        $sunil = User::where('email', 'sunil@ecotrack.lk')->first();
        $nimal = User::where('email', 'nimal@ecotrack.lk')->first();
        $kasun = User::where('email', 'kasun.w@gmail.com')->first();

        // Retrieve floors and units
        $floorA1 = Floor::with(['block', 'units'])->whereHas('block', function($q) { $q->where('name', 'Block A'); })->where('floor_number', 1)->first();
        $floorA3 = Floor::with(['block', 'units'])->whereHas('block', function($q) { $q->where('name', 'Block A'); })->where('floor_number', 3)->first();
        $floorB2 = Floor::with(['block', 'units'])->whereHas('block', function($q) { $q->where('name', 'Block B'); })->where('floor_number', 2)->first();

        // 1. COMPLETED YESTERDAY TASK (Sunil - Morning Shift, Block A, Floor 1, Unit A-101)
        if ($floorA1 && $sunil) {
            $unit = $floorA1->units->first();
            $job = Job::create([
                'worker_id' => $sunil->id,
                'block_id' => $floorA1->block_id,
                'floor_id' => $floorA1->id,
                'unit_id' => $unit ? $unit->id : null,
                'scheduled_date' => $yesterday->format('Y-m-d'),
                'shift' => 'morning',
                'status' => 'done',
                'scanned_at' => $yesterday->copy()->setTime(8, 45, 0),
                'completed_at' => $yesterday->copy()->setTime(8, 46, 12),
            ]);

            JobAudit::create([
                'job_id' => $job->id,
                'worker_id' => $sunil->id,
                'scanned_qr_hash' => $unit ? $unit->qr_code_hash : 'QR-UNIT-HASH',
                'action' => 'QR_SCANNED_OK',
                'lat' => 6.9271,
                'lng' => 79.8612,
                'device_metadata' => ['os' => 'Android 14', 'battery' => 88, 'signal' => '4G'],
                'timed_at' => $yesterday->copy()->setTime(8, 45, 0),
            ]);
        }

        // 2. INCIDENT REPORTED TASK (Nimal - Evening Shift, Block B, Floor 2, Unit B-204 - Dilani's Unit)
        if ($floorB2 && $nimal) {
            $unitB204 = Unit::where('unit_number', 'B-204')->first();
            $job2 = Job::create([
                'worker_id' => $nimal->id,
                'block_id' => $floorB2->block_id,
                'floor_id' => $floorB2->id,
                'unit_id' => $unitB204 ? $unitB204->id : null,
                'scheduled_date' => $yesterday->format('Y-m-d'),
                'shift' => 'evening',
                'status' => 'issue',
                'issue_reason' => 'Resident not at home. Gate locked with padlock from outside. Verbal contact failed.',
            ]);

            JobAudit::create([
                'job_id' => $job2->id,
                'worker_id' => $nimal->id,
                'action' => 'INCIDENT_REPORTED',
                'lat' => 6.9272,
                'lng' => 79.8614,
                'device_metadata' => ['os' => 'iOS 17.1', 'battery' => 64],
                'timed_at' => $yesterday->copy()->setTime(15, 30, 0),
            ]);
        }

        // 3. TODAY ACTIVE TASK: "IN PROGRESS" (Sunil - Morning Shift, Block A, Floor 3, Unit A-301 - Amantha's Unit)
        if ($floorA3 && $sunil) {
            $unitA301 = Unit::where('unit_number', 'A-301')->first();
            $job3 = Job::create([
                'worker_id' => $sunil->id,
                'block_id' => $floorA3->block_id,
                'floor_id' => $floorA3->id,
                'unit_id' => $unitA301 ? $unitA301->id : null,
                'scheduled_date' => $today->format('Y-m-d'),
                'shift' => 'morning',
                'status' => 'in_progress',
            ]);

            JobAudit::create([
                'job_id' => $job3->id,
                'worker_id' => $sunil->id,
                'action' => 'STATUS_MARKED_IN_PROGRESS',
                'lat' => 6.9275,
                'lng' => 79.8618,
                'timed_at' => $today->copy()->setTime(7, 30, 0),
            ]);
        }

        // 4. TODAY PENDING TASK (Sunil - Morning Shift, Block A, Floor 3, other units)
        if ($floorA3 && $sunil) {
            $otherUnits = Unit::where('floor_id', $floorA3->id)->where('unit_number', '!=', 'A-301')->get();
            foreach ($otherUnits as $u) {
                Job::create([
                    'worker_id' => $sunil->id,
                    'block_id' => $floorA3->block_id,
                    'floor_id' => $floorA3->id,
                    'unit_id' => $u->id,
                    'scheduled_date' => $today->format('Y-m-d'),
                    'shift' => 'morning',
                    'status' => 'pending',
                ]);
            }
        }

        // 5. TOMORROW SCHEDULED TASKS (Nimal - Evening Shift, Block B, Floor 2)
        if ($floorB2 && $nimal) {
            $units = Unit::where('floor_id', $floorB2->id)->get();
            foreach ($units as $u) {
                Job::create([
                    'worker_id' => $nimal->id,
                    'block_id' => $floorB2->block_id,
                    'floor_id' => $floorB2->id,
                    'unit_id' => $u->id,
                    'scheduled_date' => $tomorrow->format('Y-m-d'),
                    'shift' => 'evening',
                    'status' => 'pending',
                ]);
            }
        }
    }
}
