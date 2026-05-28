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
        Schema::create('job_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('jobs')->onDelete('cascade');
            $table->foreignId('worker_id')->constrained('users')->onDelete('cascade');
            $table->string('scanned_qr_hash')->nullable();
            $table->decimal('lat', 10, 8)->nullable(); // Audited GPS latitude signature
            $table->decimal('lng', 11, 8)->nullable(); // Audited GPS longitude signature
            $table->string('action'); // e.g. "STATUS_MARKED_IN_PROGRESS", "QR_SCANNED_OK", "STATUS_MARKED_DONE", "INCIDENT_REPORTED"
            $table->json('device_metadata')->nullable(); // For logging system versions/headers during offline sync playback
            $table->timestamp('timed_at'); // Chronological offline sync timestamp
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_audits');
    }
};
