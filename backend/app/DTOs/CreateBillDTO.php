<?php

namespace App\DTOs;

class CreateBillDTO
{
    public function __construct(
        public int $sittingId,
        public string $billTitle,
        public ?string $billReference = null,
        public ?string $legislativeStage = null,
        public ?string $description = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            sittingId: $data['sitting_id'],
            billTitle: $data['bill_title'],
            billReference: $data['bill_reference'] ?? null,
            legislativeStage: $data['legislative_stage'] ?? null,
            description: $data['description'] ?? null,
        );
    }
}














