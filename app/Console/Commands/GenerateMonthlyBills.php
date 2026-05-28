<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Unit;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Str;

class GenerateMonthlyBills extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ecotrack:generate-bills {--amount=2000 : Decimal flat-fee for standard recycling service}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate regular monthly waste recycling service bills for all occupied units';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $amount = (float) $this->option('amount');
        $billingCycle = Carbon::now()->format('F Y');
        $cycleCode = Carbon::now()->format('Y-m');

        $this->info("Billing Initiated for Cycle: {$billingCycle} at rate LKR {$amount}");

        // Retrieve units with registered resident users
        $occupiedUnits = Unit::whereNotNull('resident_id')->get();

        if ($occupiedUnits->isEmpty()) {
            $this->warn("No occupied apartment units registered. Aborting.");
            return 0;
        }

        $billsGeneratedCount = 0;

        foreach ($occupiedUnits as $unit) {
            // Check if standard bill already issued for this cycle to avoid double billing
            $matchingCycleRef = sprintf('FEES-%s-%s', $cycleCode, $unit->id);
            $exists = Payment::where('reference_code', $matchingCycleRef)->exists();

            if ($exists) {
                $this->line("Skipping Unit {$unit->unit_number}: Billing already settled/issued for {$cycleCode}.");
                continue;
            }

            // Create standard billing registry invoice
            Payment::create([
                'resident_id' => $unit->resident_id,
                'unit_id' => $unit->id,
                'amount' => $amount,
                'status' => 'unpaid',
                'payment_type' => 'monthly_fee',
                'reference_code' => $matchingCycleRef,
                'notes' => "Standard monthly solid waste collection and recycling fee: {$billingCycle}",
            ]);

            $billsGeneratedCount++;
        }

        $this->info("Successfully created {$billsGeneratedCount} monthly billing invoices for code reference prefix: {$cycleCode}!");
        return 0;
    }
}
