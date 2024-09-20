import * as vscode from 'vscode';
import { getDocStrings } from './utils/code.parser';
import { getFn } from './utils/get.fn';
import { genSwaggerJson } from './utils/generate.swaggerjs';

class SwaggerGenTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
	  return element;
	}
  
	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
	  const item = new vscode.TreeItem('Generate Swagger', vscode.TreeItemCollapsibleState.None);
	  item.command = {
		command: 'swagger-gen-auto.genstart',
		title: 'gen start'
	  };
	  return Promise.resolve([item]);
	}
  }

export function activate(context: vscode.ExtensionContext) {

	const treeDataProvider = new SwaggerGenTreeDataProvider();
	vscode.window.registerTreeDataProvider('swaggerGenAutoView', treeDataProvider);
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('swagger-gen-auto.genstart', async () => {
		vscode.window.showInformationMessage('Swagger-autogen activated!');
		const allVals:{
			basePath:string
			format:string,
			fnDir:string
		} = {
			basePath:"",
			format:"",
			fnDir:""
		}
		for (const i of Object.keys(allVals)){
			let placeholder = i === "basePath"?"Enter API base path":(i === "format"? "Enter the format in which you want the swagger (json/yaml)":"Enter dir where your azure functions reside");
			const userInput = await vscode.window.showInputBox({
				placeHolder:placeholder
			});
			if (i === "format"){
				if (userInput !== "json" && userInput !== "yaml"){
					vscode.window.showErrorMessage("Incorrect format - accepted values: json/yaml");
					return
				}
			}
			allVals[i as keyof typeof allVals] = userInput!;
		}
		let files:string[];
		let selectedFiles:string[] | undefined;
		const rootPath = vscode.workspace.workspaceFolders![0].uri;
		const srcFolderUri = vscode.Uri.joinPath(rootPath, allVals.fnDir);
		const stat = (await vscode.workspace.fs.stat(srcFolderUri)).type;
		if(stat !== vscode.FileType.Directory){
			vscode.window.showErrorMessage("No such directory found")
			return
		}else{
			files = (await vscode.workspace.fs.readDirectory(srcFolderUri)).map(el => el[0]);
			selectedFiles = await vscode.window.showQuickPick(files, {
				placeHolder:"Select API files",
				canPickMany:true
			});
		}
		const srcFilePaths = selectedFiles?.map(el => vscode.Uri.joinPath(rootPath, allVals.fnDir, el));
		const docStrings = [];
		for (const [idx, i] of srcFilePaths!.entries()){
			try {
				const fileContent = await vscode.workspace.fs.readFile(i);
				const fileText = Buffer.from(fileContent).toString('utf-8');
				const extractedDocStrings = getDocStrings(fileText).filter(el => el.tag === "request" || el.tag.startsWith("response") || el.tag === "method" || el.tag === "path" || el.tag === "query");
				console.log(extractedDocStrings);
				docStrings.push({fn:getFn(selectedFiles![idx]), extractedDocStrings})
			} catch (error) {
				console.error(error);
				vscode.window.showErrorMessage("Something went wrong while parsing file");
				return
			}
		}
		const swagger = genSwaggerJson(allVals.basePath, docStrings, allVals.format);
		// console.log(swagger);
        const filePath = vscode.Uri.joinPath(rootPath, `savefile.${allVals.format}`);
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(allVals.format === "json"?JSON.stringify(swagger):swagger as string);
        try {
            await vscode.workspace.fs.writeFile(filePath, uint8Array);
            vscode.window.showInformationMessage("Swagger saved successfully");
        } catch (error) {
            vscode.window.showErrorMessage(`There is an error: ${error}`);
        }
	});
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
