import { CosmeticType } from '../cosmetics/types';
import { controllerProblems } from '../domain/controllerCheck';

export function reportControllerProblems(type: CosmeticType): void {
    const problems = controllerProblems(type);
    if (!problems.length) return;
    Blockbench.showMessageBox({
        title: 'Animation controller',
        icon: 'warning',
        message: problems.map((p) => '• ' + p).join('\n\n'),
        buttons: ['OK'],
    });
}
