import { CosmeticType } from '../cosmetics/types';
import { mcId, mcIdDraft } from '../core/util';

export interface NamePromptOptions {
    title?: string;
    value?: string;
}

export function promptName(type: CosmeticType, onConfirm: (id: string) => void, options: NamePromptOptions = {}) {
    const dialog = new Dialog('nrc_name_' + type.id, {
        title: options.title || 'Name your ' + type.formatName,
        buttons: ['dialog.confirm', 'dialog.cancel'],
        form: {
            name: {
                label: 'Name',
                type: 'text',
                value: options.value || '',
                placeholder: type.defaultName,
                description: 'Lowercase, no spaces. This becomes the file name.',
            },
        },
        onFormChange(result: any) {
            const normalised = mcIdDraft(result.name);
            if (normalised !== result.name) dialog.setFormValues({ name: normalised }, false);
        },
        onConfirm(result: any) {
            const named = mcId(result.name);
            if (!named) {
                Blockbench.showQuickMessage('Please enter a name', 1600);
                return;
            }
            dialog.hide();
            onConfirm(named);
        },
    });
    dialog.show();
}
