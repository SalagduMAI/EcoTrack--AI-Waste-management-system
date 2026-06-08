<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role',
        'fcm_token',
        'shift',
        'status',
        'profile_photo_path',
        'nic',
        'move_in_date',
        'occupancy_type',
        'household_members',
        'recycling_plan',
        'whatsapp_enabled',
        'assistance_required',
        'emergency_contact_name',
        'emergency_contact_phone',
        'notes',
        'language',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Units represented by this user (Resident role).
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class, 'resident_id');
    }

    /**
     * Jobs assigned to this user (Worker role).
     */
    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'worker_id');
    }

    /**
     * Audits compiled by this worker (Worker role).
     */
    public function jobAudits(): HasMany
    {
        return $this->hasMany(JobAudit::class, 'worker_id');
    }

    /**
     * Payments made by this resident (Resident role).
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'resident_id');
    }

    /**
     * Ratings submitted by this resident (Resident role).
     */
    public function submittedRatings(): HasMany
    {
        return $this->hasMany(Rating::class, 'resident_id');
    }

    /**
     * Ratings received by this worker (Worker role).
     */
    public function receivedRatings(): HasMany
    {
        return $this->hasMany(Rating::class, 'worker_id');
    }

    /**
     * Chatbot logs associated with this resident (Resident role).
     */
    public function chatbotLogs(): HasMany
    {
        return $this->hasMany(ChatbotLog::class, 'resident_id');
    }

    /**
     * Complaints raised by this resident (Resident role).
     */
    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'resident_id');
    }
}
