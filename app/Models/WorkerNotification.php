<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkerNotification extends Model
{
    use HasFactory;

    protected $table = 'worker_notifications';

    protected $fillable = [
        'worker_id',
        'type',
        'title',
        'message',
        'read',
    ];

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }
}
