<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // --------------------------------------------------------------------------
        // ROLE-BASED ACCESS CONTROL GATE DEFINTIONS
        // --------------------------------------------------------------------------
        
        Gate::define('admin-access', function (User $user) {
            return $user->role === 'admin';
        });

        Gate::define('worker-access', function (User $user) {
            return $user->role === 'worker';
        });

        Gate::define('resident-access', function (User $user) {
            return $user->role === 'resident';
        });
    }
}
