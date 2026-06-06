<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// ==============================================================================
// PUBLIC / AUTHENTICATION ROUTES
// ==============================================================================
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

// ==============================================================================
// PROTECTED ROUTES (Requires Laravel Sanctum Token)
// ==============================================================================
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth Sessions & Profile Management
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/profile/update', [AuthController::class, 'updateProfile']);
    Route::post('/profile/photo', [AuthController::class, 'uploadProfilePhoto']);

    // ==========================================================================
    // OFFLINE QUEUE SYNCHRONIZATION ENDPOINT (Any protected role can upload, mainly Worker)
    // ==========================================================================
    Route::post('/sync', [\App\Http\Controllers\WorkerController::class, 'syncQueue']);

    // ==========================================================================
    // ADMIN ROLE ENDPOINTS
    // ==========================================================================
    Route::middleware('can:admin-access')->group(function () {
        Route::get('/admin/dashboard', [\App\Http\Controllers\AdminController::class, 'dashboard']);
        
        // Structures (Blocks, Floors, Units)
        Route::apiResource('/admin/blocks', \App\Http\Controllers\BlockController::class);
        Route::post('/admin/blocks/{block}/floors', [\App\Http\Controllers\BlockController::class, 'addFloor']);
        Route::post('/admin/floors/{floor}/units', [\App\Http\Controllers\FloorController::class, 'addUnit']);
        
        // Users & Worker management
        Route::get('/admin/users', [\App\Http\Controllers\AdminController::class, 'getUsers']);
        Route::post('/admin/users', [\App\Http\Controllers\AdminController::class, 'createUser']);
        Route::delete('/admin/users/{user}', [\App\Http\Controllers\AdminController::class, 'deleteUser']);
        
        // QR Codes Generation
        Route::get('/admin/qrcodes', [\App\Http\Controllers\AdminController::class, 'listQRCodes']);
        Route::post('/admin/qrcodes/generate', [\App\Http\Controllers\AdminController::class, 'generateQRCode']);
        
        // Jobs Management
        Route::apiResource('/admin/jobs', \App\Http\Controllers\JobController::class);
        Route::post('/admin/jobs/bulk', [\App\Http\Controllers\JobController::class, 'bulkCreate']);
        
        // Payments & Billing Trackers
        Route::get('/admin/payments', [\App\Http\Controllers\AdminController::class, 'payments']);
        Route::post('/admin/payments/generate-monthly', [\App\Http\Controllers\AdminController::class, 'generateMonthlyBills']);
        Route::post('/admin/payments/{id}/mark-paid', [\App\Http\Controllers\AdminController::class, 'markPaymentPaid']);
        Route::delete('/admin/payments/{id}', [\App\Http\Controllers\AdminController::class, 'deletePayment']);
        
        // Complaints Handling
        Route::get('/admin/complaints', [\App\Http\Controllers\AdminController::class, 'complaints']);
        Route::post('/admin/complaints/{id}/resolve', [\App\Http\Controllers\AdminController::class, 'resolveComplaint']);
        Route::delete('/admin/complaints/{id}', [\App\Http\Controllers\AdminController::class, 'deleteComplaint']);
        
        // Analytical PDF Reports
        Route::get('/admin/reports/monthly-summary', [\App\Http\Controllers\AdminController::class, 'monthlyReport']);
        Route::get('/admin/reports/worker-performance', [\App\Http\Controllers\AdminController::class, 'workerPerformanceReport']);
    });

    // ==========================================================================
    // WORKER ROLE ENDPOINTS
    // ==========================================================================
    Route::middleware('can:worker-access')->group(function () {
        Route::get('/worker/tasks', [\App\Http\Controllers\WorkerController::class, 'todayTasks']);
        Route::post('/worker/tasks/{id}/progress', [\App\Http\Controllers\WorkerController::class, 'markInProgress']);
        Route::post('/worker/tasks/{id}/verify-scan', [\App\Http\Controllers\WorkerController::class, 'scanVerifyAndDone']);
        Route::post('/worker/tasks/{id}/report-incident', [\App\Http\Controllers\WorkerController::class, 'reportIncident']);
        Route::get('/worker/history', [\App\Http\Controllers\WorkerController::class, 'collectionHistory']);
    });

    // ==========================================================================
    // RESIDENT ROLE ENDPOINTS
    // ==========================================================================
    Route::middleware('can:resident-access')->group(function () {
        Route::get('/resident/dashboard', [\App\Http\Controllers\ResidentController::class, 'dashboard']);
        Route::get('/resident/timeline', [\App\Http\Controllers\ResidentController::class, 'collectionTimeline']);
        
        // AI Chatbot (Eco-Bot)
        Route::post('/resident/chatbot/ask', [\App\Http\Controllers\ResidentController::class, 'chatWithEcoBot']);
        Route::post('/resident/chatbot/rate-log/{id}', [\App\Http\Controllers\ResidentController::class, 'rateChatbotResponse']);
        
        // Waste pickup bookings
        Route::post('/resident/special-pickups', [\App\Http\Controllers\ResidentController::class, 'requestBulkRemoval']);
        
        // Online payments integration (pay billing item via stripe/payhere)
        Route::get('/resident/payments', [\App\Http\Controllers\ResidentController::class, 'paymentHistory']);
        Route::post('/resident/payments/{id}/checkout-session', [\App\Http\Controllers\ResidentController::class, 'initiatePaymentSession']);
        Route::post('/resident/payments/{id}/confirm-payment', [\App\Http\Controllers\ResidentController::class, 'confirmGatewayPayment']);
        
        // Worker Feedback Raters
        Route::get('/resident/worker-to-rate', [\App\Http\Controllers\ResidentController::class, 'getPendingRatings']);
        Route::post('/resident/rate-worker', [\App\Http\Controllers\ResidentController::class, 'rateWorker']);
        
        // Missed collections / complaining logs
        Route::get('/resident/complaints', [\App\Http\Controllers\ResidentController::class, 'myComplaints']);
        Route::post('/resident/report-missed', [\App\Http\Controllers\ResidentController::class, 'reportMissedCollection']);
    });
});
