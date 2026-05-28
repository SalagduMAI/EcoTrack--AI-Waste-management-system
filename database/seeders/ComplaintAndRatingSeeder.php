<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Complaint;
use App\Models\Rating;
use App\Models\User;
use App\Models\Job;
use App\Models\Unit;

class ComplaintAndRatingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Retrieve residents
        $amantha = User::where('email', 'amanthasalgadu@ecotrack.lk')->first();
        $dilani = User::where('email', 'dilani@gmail.com')->first();
        $priya = User::where('email', 'priya@gmail.com')->first();

        // Retrieve workers
        $sunil = User::where('email', 'sunil@ecotrack.lk')->first();

        // Retrieve units
        $unitA301 = Unit::where('unit_number', 'A-301')->first();
        $unitB204 = Unit::where('unit_number', 'B-204')->first();

        // Retrieve completed job
        $completedJob = Job::where('status', 'done')->first();

        // 1. COMPLAINTS
        if ($dilani && $unitB204) {
            Complaint::create([
                'complaint_code' => 'C-681',
                'resident_id' => $dilani->id,
                'unit_id' => $unitB204->id,
                'category' => 'missed_collection',
                'description' => 'The evening collection truck/staff skipped B-204 floor completely today despite bin bags placed at the bin area early.',
                'status' => 'open',
            ]);
        }

        if ($priya) {
            Complaint::create([
                'complaint_code' => 'C-109',
                'resident_id' => $priya->id,
                'category' => 'wrong_time',
                'description' => 'The worker collected organic bags at 05:45 AM today instead of the scheduled shift start at 06:00 AM, making loud noise in the corridor.',
                'status' => 'resolved',
                'internal_notes' => 'Resident contacted. Staff instructed to avoid entering the residential floor corridors before exactly 06:00 AM.',
            ]);
        }

        // 2. RATINGS FOR WORKER SERVICE AUDIT
        if ($completedJob && $amantha && $sunil) {
            Rating::create([
                'job_id' => $completedJob->id,
                'resident_id' => $amantha->id,
                'worker_id' => $sunil->id,
                'rating' => 5,
                'feedback' => 'Sunil is always on time, very polite and ensures the floor bin area is pristine after collection. Five stars!',
            ]);
        }
    }
}
