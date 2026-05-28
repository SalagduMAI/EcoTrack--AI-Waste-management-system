<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Payment;
use App\Models\User;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Support\Str;

class PaymentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $today = Carbon::parse('2026-05-20');

        // Fetch Residents to assign financial ledger entries
        $amantha = User::where('email', 'amanthasalgadu@ecotrack.lk')->first();
        $dilani = User::where('email', 'dilani@gmail.com')->first();
        $priya = User::where('email', 'priya@gmail.com')->first();

        // Fetch matching registered housing units
        $unitA301 = Unit::where('unit_number', 'A-301')->first();
        $unitB204 = Unit::where('unit_number', 'B-204')->first();
        $unitA105 = Unit::where('unit_number', 'A-105')->first();

        // 1. AMANTHA SALGADU (A-301) BILLS
        if ($amantha && $unitA301) {
            // March Bill - Paid
            Payment::create([
                'resident_id' => $amantha->id,
                'unit_id' => $unitA301->id,
                'amount' => 1000.00,
                'status' => 'paid',
                'payment_method' => 'payhere',
                'transaction_id' => 'TXN-' . Str::upper(Str::random(10)),
                'reference_code' => 'RF-202603-01',
                'payment_type' => 'monthly_fee',
                'notes' => 'March 2026 Waste & Recycling Facility maintenance levy',
                'paid_at' => $today->copy()->subDays(60),
            ]);

            // April Bill - Paid
            Payment::create([
                'resident_id' => $amantha->id,
                'unit_id' => $unitA301->id,
                'amount' => 1000.00,
                'status' => 'paid',
                'payment_method' => 'stripe',
                'transaction_id' => 'CHG_ST_' . Str::upper(Str::random(12)),
                'reference_code' => 'RF-202604-01',
                'payment_type' => 'monthly_fee',
                'notes' => 'April 2026 Waste & Recycling Facility maintenance levy',
                'paid_at' => $today->copy()->subDays(25),
            ]);

            // May Bill - Unpaid
            Payment::create([
                'resident_id' => $amantha->id,
                'unit_id' => $unitA301->id,
                'amount' => 1000.00,
                'status' => 'unpaid',
                'reference_code' => 'RF-202605-01',
                'payment_type' => 'monthly_fee',
                'notes' => 'Current Month (May 2026) Waste & Recycling Facility maintenance levy',
            ]);
        }

        // 2. DILANI SENANAYAKE (B-204) BILLS
        if ($dilani && $unitB204) {
            // May Bill - Unpaid
            Payment::create([
                'resident_id' => $dilani->id,
                'unit_id' => $unitB204->id,
                'amount' => 1000.00,
                'status' => 'unpaid',
                'reference_code' => 'RF-202605-02',
                'payment_type' => 'monthly_fee',
                'notes' => 'May 2026 Monthly Trash Management Charge',
            ]);

            // Special Pickup Bill - Unpaid
            Payment::create([
                'resident_id' => $dilani->id,
                'unit_id' => $unitB204->id,
                'amount' => 1500.00,
                'status' => 'unpaid',
                'reference_code' => 'SP-202605-19A',
                'payment_type' => 'special_pickup',
                'notes' => 'Electronic Waste Removal (Broken CRT Television & Microwave)',
            ]);
        }

        // 3. PRIYA JAYASINGHE (A-105) BILLS
        if ($priya && $unitA105) {
            // May Bill - Paid via Bank Transfer
            Payment::create([
                'resident_id' => $priya->id,
                'unit_id' => $unitA105->id,
                'amount' => 1000.00,
                'status' => 'paid',
                'payment_method' => 'bank_transfer',
                'transaction_id' => 'BTR-' . mt_rand(10000, 99999),
                'reference_code' => 'RF-202605-03',
                'payment_type' => 'monthly_fee',
                'notes' => 'May 2026 Facility garbage disposal fees paid directly',
                'paid_at' => $today->copy()->subDays(5),
            ]);
        }
    }
}
