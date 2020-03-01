import * as vscode from 'vscode'
import * as temp from 'temp';
import * as fs from 'fs';
import * as assert from 'assert';

const window = vscode.window;

const ZERO_POSITION = new vscode.Position(0, 0)

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function replaceTextInCurrentEditor(content: string) {
    const editor = (vscode.window.activeTextEditor as vscode.TextEditor);
    return new Promise((resolve) => {
        editor.edit(edit => {
            const all = new vscode.Range(ZERO_POSITION, new vscode.Position(editor.document.lineCount + 1, 0));
            edit.replace(all, content);
            resolve();
        })
    })
}

export default async function openNewJsonDocument(text: string) {
    const tempFile = temp.openSync({
        suffix: '.json'
    });
    fs.openSync(tempFile.path, 'a+');

    const document = await vscode.workspace.openTextDocument(tempFile.path);
    const editor = await window.showTextDocument(document);
    // Mark file as dirty to bypass preview mode that would open the next file in the current tab.
    await replaceTextInCurrentEditor(text);
    editor.selection = new vscode.Selection(ZERO_POSITION, ZERO_POSITION)
    await sleep(100);
    return {
        document,
        editor
    }
}

export interface SelectionRange {
	/**
	 * The [range](#Range) of this selection range.
	 */
	range: vscode.Range;

	/**
	 * The parent selection range containing this range. Therefore `parent.range` must contain `this.range`.
	 */
	parent?: SelectionRange;
}

suite('Find enclosing array', () => {


    test(`should find enclosing array`, async () => {
        const array = [
            {
                id: 1,
                array: ["foo", "bar"]
            },
            {
                id: 2,
            }
        ]
        const {
            document,
            editor
        } = await openNewJsonDocument(JSON.stringify(array, null, 2));
        const positionBeforeStringFoo = new vscode.Position(6, 8);
        editor.selection = new vscode.Selection(positionBeforeStringFoo, positionBeforeStringFoo);
        await sleep(100);
        const selectionRanges: SelectionRange[] = await vscode.commands.executeCommand('vscode.executeSelectionRangeProvider', document.uri, [editor.selection.active]) as SelectionRange[]
        const start = selectionRanges[0].range.start
        const end = selectionRanges[0].range.end
        assert.equal(start.line, 3)
        assert.equal(start.character, 13)
        assert.equal(end.line, 6)
        assert.equal(end.character, 5)
    });
});