<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // 1. Run dynamic waste collection scheduler hourly to auto-assign pending jobs
        $schedule->command('ecotrack:schedule-jobs')->hourly();

        // 2. Clear old/unhelpful chatbot logs every Sunday at midnight
        $schedule->command('ecotrack:clean-logs')->weeklyOn(0, '00:00');

        // 3. Automate monthly waste fee invoicing on the 1st day of every month at 01:00
        $schedule->command('ecotrack:generate-bills')->monthlyOn(1, '01:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
