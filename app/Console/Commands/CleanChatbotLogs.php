<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ChatbotLog;
use Carbon\Carbon;

class CleanChatbotLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ecotrack:clean-logs {--days=30 : Prune logs older than this duration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune old or unhelpful chatbot queries logs from the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('days');
        $cutoffDate = Carbon::now()->subDays($days);

        $this->info("Pruning chatbot logs created before: " . $cutoffDate->format('Y-m-d H:i:s'));

        // Query old logs
        $query = ChatbotLog::where('created_at', '<', $cutoffDate);
        $totalOldLogs = $query->count();

        if ($totalOldLogs === 0) {
            $this->info("Database contains no expired advisor logs. No actions taken.");
            return 0;
        }

        // Delete matches
        $query->delete();

        $this->info("Completed successfully! Cleaned {$totalOldLogs} historic conversation logs.");
        return 0;
    }
}
