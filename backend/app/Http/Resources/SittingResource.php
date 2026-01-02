<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SittingResource extends JsonResource
{
    /**
     * Transform the resource into an array for the frontend.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $session = $this->session;
        $assembly = $session?->assembly;
        
        // Format time from time_opened (can be datetime or time)
        $time = '';
        if ($this->time_opened) {
            if ($this->time_opened instanceof \Carbon\Carbon || $this->time_opened instanceof \DateTime) {
                $time = $this->time_opened->format('H:i');
            } elseif (is_string($this->time_opened)) {
                // If it's already a string in H:i format, use it directly
                $time = $this->time_opened;
            }
        }
        
        // Map status to frontend format
        $status = match($this->status) {
            'official' => 'Official Record',
            'submitted' => 'Submitted',
            'draft' => 'Draft',
            default => 'Draft',
        };
        
        // Generate summary text from agenda items and bills
        $summaryText = $this->generateSummaryText();
        
        return [
            'id' => (string) $this->id,
            'assembly' => $assembly?->name ?? 'Unknown Assembly',
            'session' => $session?->name ?? 'Unknown Session',
            'date' => $this->date->format('Y-m-d'),
            'time' => $time,
            'status' => $status,
            'summaryText' => $summaryText,
            'agendaItems' => $this->whenLoaded('agendaItems', function () {
                return $this->agendaItems->map(function ($item) {
                    return [
                        'id' => (string) $item->id,
                        'number' => $item->order,
                        'title' => $item->title,
                        'content' => $item->procedural_text ?? '',
                    ];
                });
            }, []),
            'bills' => $this->whenLoaded('bills', function () {
                return $this->bills->map(function ($bill) {
                    return [
                        'id' => (string) $bill->id,
                        'title' => $bill->bill_title,
                        'stage' => $bill->stage ?? 'First Reading',
                    ];
                });
            }, []),
        ];
    }
    
    /**
     * Generate summary text from agenda items and bills
     */
    private function generateSummaryText(): ?string
    {
        $parts = [];
        
        // Add agenda items summary
        if ($this->relationLoaded('agendaItems')) {
            $agendaItems = $this->agendaItems;
            if ($agendaItems && $agendaItems->isNotEmpty()) {
                $agendaCount = $agendaItems->count();
                $parts[] = "{$agendaCount} agenda item" . ($agendaCount > 1 ? 's' : '');
            }
        }
        
        // Add bills summary
        if ($this->relationLoaded('bills')) {
            $bills = $this->bills;
            if ($bills && $bills->isNotEmpty()) {
                $billCount = $bills->count();
                $billTitles = $bills->pluck('bill_title')->filter()->take(2)->implode(', ');
                if ($billTitles) {
                    if ($billCount > 2) {
                        $billTitles .= ' and ' . ($billCount - 2) . ' more';
                    }
                    $parts[] = "discussion of {$billTitles}";
                }
            }
        }
        
        if (empty($parts)) {
            return null;
        }
        
        return 'The sitting focused on ' . implode(' and ', $parts) . '.';
    }
}

