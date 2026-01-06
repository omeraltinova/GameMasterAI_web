"use client";

import { Modal } from "@/components/ui";
import { InventoryGrid } from "./InventoryGrid";

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: string;
}

export function InventoryModal({ isOpen, onClose, characterId }: InventoryModalProps) {
    return (
        <Modal
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title="Envanter"
            size="full"
        >
            <div className="max-h-[70vh] overflow-y-auto -mx-2 px-2">
                <InventoryGrid
                    characterId={characterId}
                    editable={true}
                />
            </div>
        </Modal>
    );
}
