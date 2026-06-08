<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\KnowledgeBase;
use Illuminate\Support\Facades\Http;

class GenerateKnowledgeBaseEmbeddings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:generate-knowledge-base-embeddings';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate and store Gemini embeddings for all knowledge base articles';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $apiKey = env('GEMINI_API_KEY');
        if (empty($apiKey) || $apiKey === 'MY_GEMINI_API_KEY') {
            $this->error('GEMINI_API_KEY is not configured in .env file.');
            return Command::FAILURE;
        }

        $articles = KnowledgeBase::all();
        $this->info("Found " . $articles->count() . " articles to embed.");

        foreach ($articles as $article) {
            $textToEmbed = "Title: {$article->title}\nCategory: {$article->category}\nTags: {$article->tags}\nContent: {$article->content}";
            $this->line("Generating embedding for: {$article->title}...");

            try {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=" . $apiKey;
                
                $response = Http::withoutVerifying()->post($endpoint, [
                    'model' => 'models/gemini-embedding-2',
                    'content' => [
                        'parts' => [
                            ['text' => $textToEmbed]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $embedding = $json['embedding']['values'] ?? null;
                    if ($embedding) {
                        $article->update(['embedding' => $embedding]);
                        $this->info("Successfully generated and saved embedding for: {$article->title}");
                    } else {
                        $this->error("Failed to parse embedding values for: {$article->title}");
                    }
                } else {
                    $this->error("API error for {$article->title}: " . $response->body());
                }
            } catch (\Exception $e) {
                $this->error("Exception for {$article->title}: " . $e->getMessage());
            }
        }

        $this->info("Completed embedding generation.");
        return Command::SUCCESS;
    }
}
