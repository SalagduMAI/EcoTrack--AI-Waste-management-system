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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('unit_id')->nullable()->constrained('units')->onDelete('set null');
            $table->decimal('amount', 10, 2); // e.g. 1500.00 LKR
            $table->string('currency', 3)->default('LKR');
            $table->enum('status', ['paid', 'unpaid', 'failed'])->default('unpaid');
            $table->enum('payment_type', ['monthly_fee', 'special_pickup'])->default('monthly_fee');
            $table->enum('payment_method', ['payhere', 'stripe', 'bank_transfer', 'cash'])->nullable();
            $table->string('reference_code')->unique()->nullable(); // system reference e.g., EC-2026-05-A301
            $table->string('transaction_id')->unique()->nullable(); // gateway ID e.g., TXN-294821
            $table->timestamp('paid_at')->nullable();
            $table->string('billing_period')->nullable(); // e.g. "May 2026"
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
