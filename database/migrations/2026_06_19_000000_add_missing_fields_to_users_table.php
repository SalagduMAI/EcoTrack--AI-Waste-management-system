<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'nic')) {
                $table->string('nic')->nullable();
            }
            if (!Schema::hasColumn('users', 'move_in_date')) {
                $table->date('move_in_date')->nullable();
            }
            if (!Schema::hasColumn('users', 'occupancy_type')) {
                $table->string('occupancy_type')->nullable();
            }
            if (!Schema::hasColumn('users', 'household_members')) {
                $table->integer('household_members')->nullable();
            }
            if (!Schema::hasColumn('users', 'recycling_plan')) {
                $table->string('recycling_plan')->nullable();
            }
            if (!Schema::hasColumn('users', 'whatsapp_enabled')) {
                $table->boolean('whatsapp_enabled')->default(false);
            }
            if (!Schema::hasColumn('users', 'assistance_required')) {
                $table->boolean('assistance_required')->default(false);
            }
            if (!Schema::hasColumn('users', 'emergency_contact_name')) {
                $table->string('emergency_contact_name')->nullable();
            }
            if (!Schema::hasColumn('users', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone')->nullable();
            }
            if (!Schema::hasColumn('users', 'notes')) {
                $table->text('notes')->nullable();
            }
            if (!Schema::hasColumn('users', 'language')) {
                $table->string('language')->default('English');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'nic', 'move_in_date', 'occupancy_type', 'household_members',
                'recycling_plan', 'whatsapp_enabled', 'assistance_required',
                'emergency_contact_name', 'emergency_contact_phone', 'notes', 'language'
            ]);
        });
    }
};
