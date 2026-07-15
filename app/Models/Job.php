<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Job extends Model
{
    use HasFactory;

    protected $fillable = [
        'worker_id',
        'block_id',
        'floor_id',
        'unit_id',
        'scheduled_date',
        'shift',
        'status',
        'issue_reason',
        'incident_photo_path',
        'scanned_at',
        'completed_at',
        'recurring',
    ];

    protected $casts = [
        'scheduled_date' => 'date:Y-m-d',
        'scanned_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($job) {
            if ($job->unit_id) {
                $unit = Unit::with('floor')->find($job->unit_id);
                if ($unit) {
                    if (!$job->floor_id) {
                        $job->floor_id = $unit->floor_id;
                    }
                    if (!$job->block_id && $unit->floor) {
                        $job->block_id = $unit->floor->block_id;
                    }
                }
            }
            if ($job->floor_id && !$job->block_id) {
                $floor = Floor::find($job->floor_id);
                if ($floor) {
                    $job->block_id = $floor->block_id;
                }
            }
        });
    }

    public static function resolveMissedJobs()
    {
        $now = \Carbon\Carbon::now();
        $todayStr = $now->format('Y-m-d');
        $currentHour = $now->hour;
        $yesterdayStr = $now->copy()->subDay()->format('Y-m-d');

        // 1. Expire past dates, but exclude yesterday's night shift if it's currently before 6 AM
        self::where('scheduled_date', '<', $todayStr)
            ->whereIn('status', ['pending', 'in_progress'])
            ->where(function($query) use ($yesterdayStr, $currentHour) {
                if ($currentHour < 6) {
                    $query->whereNot(function($q) use ($yesterdayStr) {
                        $q->where('scheduled_date', $yesterdayStr)
                          ->where('shift', 'night');
                    });
                }
            })
            ->update([
                'status' => 'issue',
                'issue_reason' => 'Missed Collection - Shift expired without completion'
            ]);

        // 2. Today's ended shifts
        if ($currentHour >= 14) {
            self::where('scheduled_date', $todayStr)
                ->where('shift', 'morning')
                ->whereIn('status', ['pending', 'in_progress'])
                ->update([
                    'status' => 'issue',
                    'issue_reason' => 'Missed Collection - Morning shift expired'
                ]);
        }
        if ($currentHour >= 22) {
            self::where('scheduled_date', $todayStr)
                ->where('shift', 'evening')
                ->whereIn('status', ['pending', 'in_progress'])
                ->update([
                    'status' => 'issue',
                    'issue_reason' => 'Missed Collection - Evening shift expired'
                ]);
        }

        // 3. Yesterday's night shift (ends at 06:00 today)
        if ($currentHour >= 6) {
            self::where('scheduled_date', $yesterdayStr)
                ->where('shift', 'night')
                ->whereIn('status', ['pending', 'in_progress'])
                ->update([
                    'status' => 'issue',
                    'issue_reason' => 'Missed Collection - Night shift expired'
                ]);
        }
    }

    /**
     * Assigned waste worker.
     */
    public function worker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    /**
     * Block containing the floor/unit.
     */
    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class);
    }

    /**
     * Floor level targeted by this job.
     */
    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    /**
     * Unit level targeted by this job, if applicable.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * Auditable sequence records associated with this job.
     */
    public function audits(): HasMany
    {
        return $this->hasMany(JobAudit::class);
    }

    /**
     * Rating submitted for this completed collections task.
     */
    public function rating(): HasOne
    {
        return $this->hasOne(Rating::class);
    }

    /**
     * Missed collection or behavioral complaints raised from this activity.
     */
    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }
}
