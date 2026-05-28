<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KnowledgeBase;

class KnowledgeBaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        KnowledgeBase::create([
            'title' => 'Biodegradable Organic Sorting Norms',
            'category' => 'organic',
            'content' => "Biodegradable wet waste includes clean food scraps, vegetable peels, fruit skins, coffee grounds, eggshells, and tea bags. Ensure no plastic wrappers, metal wires, or rubber bands are added to wet waste. Store in compostable green bin bags. Collections occur organic daily matching morning worker allocation shifts.",
            'tags' => 'organic green compost wet food waste peel kitchen vegetable',
        ]);

        KnowledgeBase::create([
            'title' => 'Recyclable Plastics and Poly-materials',
            'category' => 'recycling',
            'content' => "Dispose of rigid plastic containers, PET beverage bottles, milk cartons, and cardboard boxes inside blue bin bags. Wash containers thoroughly to prevent contamination of secondary streams. Flat pack paper boxes for space-saving floor staging.",
            'tags' => 'recycling plastic paper card blue pet bottles wash clean flat pack',
        ]);

        KnowledgeBase::create([
            'title' => 'E-Waste & Bulky Furniture Discard Guidelines',
            'category' => 'bulk',
            'content' => "Household electronics (televisions, batteries, mobile devices, computer units) and bulky items (sofas, mattresses) cannot be placed in general chute/garbage bins. Residents must book a 'Specialized Bulk Removal Request' in their portal. Service carries an automatic premium of LKR 1500 directly billed to matching monthly invoices.",
            'tags' => 'bulky furniture electronics e-waste laptop mattress sofa booking invoice 1500 fee',
        ]);

        KnowledgeBase::create([
            'title' => 'Hazardous & Medical Waste Restrictions',
            'category' => 'hazard',
            'content' => "Hazardous waste including unused medicine, medical syringes, chemical cleaners, paints, and fluorescent bulbs should not be mixed with standard recyclables. Seal items inside red specialized disposal pouches and contact management team for secure collections directly.",
            'tags' => 'hazard medicine medical syringe oil paint chemical red pouch safety danger',
        ]);

        KnowledgeBase::create([
            'title' => 'Daily Shift Schedules & Chutes',
            'category' => 'general',
            'content' => "Morning Collection Shift: 06:00 AM to 11:30 AM (primarily organic & kitchen waste sorting). Evening Collection Shift: 02:00 PM to 06:30 PM (recyclables & scheduled unit door audits). Night Cleanups: 08:30 PM to 11:00 PM (common floor staging and trash chute checks). Ensure bags are kept labeled inside respective floor bins by start of shift.",
            'tags' => 'shifts hours schedule morning evening night organic timing routine collections',
        ]);
    }
}
