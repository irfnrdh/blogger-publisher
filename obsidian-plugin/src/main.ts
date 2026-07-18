import { App, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, TFile } from 'obsidian';
import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';

const execFile = util.promisify(child_process.execFile);

interface BloggerPublisherSettings {
	cliPath: string;
	pullDirectory: string;
}

const DEFAULT_SETTINGS: BloggerPublisherSettings = {
	cliPath: 'blogger-publisher',
	pullDirectory: 'articles-pulled'
}

export default class BloggerPublisherPlugin extends Plugin {
	settings: BloggerPublisherSettings;

	async onload() {
		await this.loadSettings();

		// Add Ribbon Icon for Publishing
		const ribbonIconEl = this.addRibbonIcon('paper-plane', 'Publish to Blogger', async (evt: MouseEvent) => {
			await this.publishCurrentFile();
		});
		ribbonIconEl.addClass('blogger-publisher-ribbon-class');

		// Add Ribbon Icon for Pulling
		const pullRibbonIconEl = this.addRibbonIcon('download-cloud', 'Pull from Blogger', async (evt: MouseEvent) => {
			await this.pullFromBlogger();
		});
		pullRibbonIconEl.addClass('blogger-publisher-pull-ribbon-class');

		// Add Command: Publish Current File
		this.addCommand({
			id: 'publish-current-file',
			name: 'Publish current file',
			callback: async () => {
				await this.publishCurrentFile();
			}
		});

		// Add Command: Pull from Blogger
		this.addCommand({
			id: 'pull-from-blogger',
			name: 'Pull all posts from Blogger',
			callback: async () => {
				await this.pullFromBlogger();
			}
		});

		// Settings Tab
		this.addSettingTab(new BloggerPublisherSettingTab(this.app, this));
	}

	onunload() {
	}

	async publishCurrentFile() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('❌ No active file to publish.');
			return;
		}

		if (activeFile.extension !== 'md') {
			new Notice('❌ Only Markdown files can be published.');
			return;
		}

		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			const vaultPath = adapter.getBasePath();
			const filePath = path.join(vaultPath, activeFile.path);

			new Notice(`🚀 Publishing ${activeFile.name} to Blogger...`);
			try {
				// Use the configured CLI path
				const cliCmd = this.settings.cliPath;
				
				// Execute command in the vault directory using execFile to prevent injection
				const { stdout, stderr } = await execFile(cliCmd, ['publish', filePath], { cwd: vaultPath });
				
				// Optional: You could parse stdout to show the public URL
				console.log('Blogger Publisher [stdout]:', stdout);
				
				if (stderr) {
					console.warn('Blogger Publisher [stderr]:', stderr);
				}

				if (stdout.includes('BERHASIL') || stdout.includes('SUCCESS') || stdout.includes('Identical')) {
					new Notice(`✅ Successfully published ${activeFile.name}!`);
				} else if (stdout.includes('SKIP')) {
					new Notice(`⏭️ Skipped (No changes detected).`);
				} else {
					// Fallback success if command didn't throw
					new Notice(`✅ Published ${activeFile.name}! Check terminal for details.`);
				}
				
			} catch (e: any) {
				console.error('Blogger Publisher Error:', e);
				new Notice(`❌ Failed to publish: ${e.message}`);
			}
		} else {
			new Notice('❌ Cannot publish: Vault is not on the local file system.');
		}
	}

	async pullFromBlogger() {
		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			const vaultPath = adapter.getBasePath();
			const pullDir = this.settings.pullDirectory || 'articles-pulled';
			const pullPath = path.join(vaultPath, pullDir);

			new Notice(`📥 Pulling posts from Blogger into /${pullDir}...`);
			try {
				const cliCmd = this.settings.cliPath;
				const { stdout, stderr } = await execFile(cliCmd, ['pull', pullPath], { cwd: vaultPath });
				
				console.log('Blogger Publisher Pull [stdout]:', stdout);
				new Notice(`✅ Successfully pulled posts from Blogger!`);
				
			} catch (e: any) {
				console.error('Blogger Publisher Error:', e);
				new Notice(`❌ Failed to pull: ${e.message}`);
			}
		} else {
			new Notice('❌ Cannot pull: Vault is not on the local file system.');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class BloggerPublisherSettingTab extends PluginSettingTab {
	plugin: BloggerPublisherPlugin;

	constructor(app: App, plugin: BloggerPublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Blogger Publisher Settings'});

		new Setting(containerEl)
			.setName('CLI Path')
			.setDesc('Path to the blogger-publisher executable. If it is in your PATH, just use "blogger-publisher". On Mac/Linux, you might need "/usr/local/bin/blogger-publisher".')
			.addText(text => text
				.setPlaceholder('blogger-publisher')
				.setValue(this.plugin.settings.cliPath)
				.onChange(async (value) => {
					this.plugin.settings.cliPath = value.trim() || 'blogger-publisher';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pull Directory')
			.setDesc('The folder inside your vault where pulled articles will be saved.')
			.addText(text => text
				.setPlaceholder('articles-pulled')
				.setValue(this.plugin.settings.pullDirectory)
				.onChange(async (value) => {
					this.plugin.settings.pullDirectory = value.trim() || 'articles-pulled';
					await this.plugin.saveSettings();
				}));
	}
}
