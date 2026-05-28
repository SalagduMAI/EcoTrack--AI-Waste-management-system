<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'worker_id',
        'scanned_qr_hash',
        'lat',
        'lng',
        'action',
        'device_metadata',
        'timed_at',
    ];

    protected $casts = [
        'device_metadata' => 'array',
        'timed_at' => 'datetime',
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
    ];

    /**
     * Parent job being audited.
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    /**
     * Worker reporting this audit trace log.
     */
    public function worker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'worker_id');
    }
}
