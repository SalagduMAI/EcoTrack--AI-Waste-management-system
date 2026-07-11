<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set standard index string limits representing SQLite / MariaDB defaults
        Schema::defaultStringLength(191);

        try {
            if (Schema::hasTable('jobs')) {
                \App\Models\Job::resolveMissedJobs();
            }
        } catch (\Exception $e) {
            // Silence if database not migrated/connected yet
        }
    }
}
