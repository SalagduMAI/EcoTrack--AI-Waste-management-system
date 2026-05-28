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
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('floor_id')->constrained('floors')->onDelete('cascade');
            $table->string('unit_number'); // e.g. "A-301"
            $table->foreignId('resident_id')->nullable()->constrained('users')->onDelete('set null'); // The resident representing this unit
            $table->string('qr_code_hash')->nullable()->unique(); // Unique QR hash for this specific unit (optional but handy)
            $table->timestamps();
            
            // Avoid duplicate unit numbers per floor
            $table->unique(['floor_id', 'unit_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
