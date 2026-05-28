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
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('block_id')->constrained('blocks')->onDelete('cascade');
            $table->foreignId('floor_id')->constrained('floors')->onDelete('cascade');
            $table->foreignId('unit_id')->nullable()->constrained('units')->onDelete('cascade'); // Can be floorwide (nullable) or specific to a unit
            $table->date('scheduled_date');
            $table->enum('shift', ['morning', 'evening', 'night']);
            $table->enum('status', ['pending', 'in_progress', 'done', 'issue'])->default('pending');
            $table->text('issue_reason')->nullable(); // e.g. "Door locked - no response"
            $table->string('incident_photo_path')->nullable(); // Link to the submitted incident photo
            $table->timestamp('scanned_at')->nullable(); // Timestamp of physical QR scan verification
            $table->timestamp('completed_at')->nullable(); // Timestamp of actual completion
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jobs');
    }
};
