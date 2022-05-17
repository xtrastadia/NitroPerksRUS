/**
 * @name NitroPerks
 * @author 0xDub
 * @version 1.0.0 RUS
 * @source https://github.com/xtrastadia/NitroPerksRUS
 * @updateUrl https://raw.githubusercontent.com/xtrastadia/NitroPerksRUS/main/NitroPerks.plugin.js
 */
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/
module.exports = (() => {
    const config = {
        "info": {
            "name": "NitroPerks",
            "authors": [{
                "name": "0xDub",
                "discord_id": "407010427667742720",
                "github_username": "xtrastadia"
            }],
            "version": "1.0.0",
            "description": "Разблокируйет все режимы демонстрации экрана и использование межсерверных эмоций и gif-эмоций по всему Discord! (Однако вы НЕ МОЖЕТЕ загружать файлы размером 100 МБ. :/)",
            "github": "https://github.com/xtrastadia/NitroPerksRUS",
            "github_raw": "https://raw.githubusercontent.com/xtrastadia/NitroPerksRUS/main/NitroPerks.plugin.jss"
        },
        "main": "NitroPerks.plugin.js"
    };

    return !global.ZeresPluginLibrary ? class {
        constructor() {
            this._config = config;
        }
        getName() {
            return config.info.name;
        }
        getAuthor() {
            return config.info.authors.map(a => a.name).join(", ");
        }
        getDescription() {
            return config.info.description;
        }
        getVersion() {
            return config.info.version;
        }
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
            const {
                Patcher,
                DiscordModules,
                Settings,
                Toasts,
                PluginUtilities
            } = Api;
			
            return class NitroPerks extends Plugin {
                defaultSettings = {
                    "emojiSize": "48",
                    "screenSharing": true,
                    "emojiBypass": true,
					"ghostMode": true,
					"freeStickersCompat": false,
                    "clientsidePfp": false,
					"emojiBypassForValidEmoji": true,
					"PNGemote" : true,
                    "pfpUrl": "https://i.imgur.com/N6X1vzT.gif",
                };
                settings = PluginUtilities.loadSettings(this.getName(), this.defaultSettings);
                originalNitroStatus = 0;
                getSettingsPanel() {
                    return Settings.SettingPanel.build(_ => this.saveAndUpdate(), ...[
                        new Settings.SettingGroup("Функции").append(...[
                            new Settings.Switch("High Quality Screensharing", "1080p/исходное @ 60fps трансляции. Нет причин отключать этот параметр, особенно потому, что он ничего не делает, если вы это сделаете.", this.settings.screenSharing, value => this.settings.screenSharing = value),
							new Settings.Switch("FreeStickers Compatibility Mode", "Включите, если вы используете бесплатные стикеры. Это заблокирует исходное разрешение демонстрации экрана, но бесплатные стикеры будут работать.", this.settings.freeStickersCompat, value => this.settings.freeStickersCompat = value)
                        ]),
                        new Settings.SettingGroup("Эмодзи").append(
                            new Settings.Switch("Nitro Emotes Bypass", "Включить или отключить использование обхода эмодзи.", this.settings.emojiBypass, value => this.settings.emojiBypass = value),
                            new Settings.Slider("Size", "Размер эмодзи в пикселях. Значение по умолчанию равно 48.", 16, 128, this.settings.emojiSize, size=>this.settings.emojiSize = size, {markers:[16,32,48,64,80,96,112,128], stickToMarkers:true}), //made slider wider and have more options
							new Settings.Switch("Ghost Mode", "Использует ошибку с призрачным сообщением, чтобы скрыть URL-адрес эмодзи. Не будет отображаться для тех, кто работает в приложении для Android.", this.settings.ghostMode, value => this.settings.ghostMode = value),
							new Settings.Switch("Don't Use Emote Bypass if Emote is Unlocked", "Отключите использование обхода эмодзи, даже если для этого эмодзи обход не требуется.", this.settings.emojiBypassForValidEmoji, value => this.settings.emojiBypassForValidEmoji = value),
							new Settings.Switch("Use PNG instead of WEBP", "Используйет PNG-версию эмодзи для более высокого качества!", this.settings.PNGemote, value => this.settings.PNGemote = value)
						),
                            new Settings.SettingGroup("Изображение профиля").append(...[
                                new Settings.Switch("Clientsided Profile Picture", "**Был удален; попробуйте плагин EditUsers.** (Включение или отключение изображения профиля на стороне клиента.)", this.settings.clientsidePfp, value => this.settings.clientsidePfp = value),
                                new Settings.Textbox("URL", "The direct URL that has the profile picture you want.", this.settings.pfpUrl,
                                    image => {
                                        try {
                                            new URL(image)
                                        } catch {
                                            return Toasts.error('Неверный URL!')
                                        }
                                        this.settings.pfpUrl = image
                                    }
                                )
                            ])
                    ])
                }

                
				
                saveAndUpdate() {
                    PluginUtilities.saveSettings(this.getName(), this.settings)
                    if (this.settings.emojiBypass) {
						if(this.settings.ghostMode) { //If Ghost Mode is enabled do this shit
							Patcher.unpatchAll(DiscordModules.MessageActions)
							//console.log("Ghost Mode enabled.")
							Patcher.before(DiscordModules.MessageActions, "sendMessage", (_, [, msg]) => {
							var currentChannelId = BdApi.findModuleByProps("getLastChannelFollowingDestination").getChannelId()
                            msg.validNonShortcutEmojis.forEach(emoji => {
							if (this.settings.PNGemote){
								emoji.url = emoji.url.replace('.webp', '.png')
								}
							if (emoji.url.startsWith("/assets/")) return;
							if(this.settings.emojiBypassForValidEmoji){ //a bit messy but it works
								DiscordModules.UserStore.getCurrentUser().premiumType = 0
								if(!DiscordModules.EmojiInfo.isEmojiFilteredOrLocked(emoji)){
									if(this.settings.freeStickersCompat){
									DiscordModules.UserStore.getCurrentUser().premiumType = 1
								}
								if(!this.settings.freeStickersCompat){
									DiscordModules.UserStore.getCurrentUser().premiumType = 2
								}
								return
								}
								if(this.settings.freeStickersCompat){
								DiscordModules.UserStore.getCurrentUser().premiumType = 1
								}
								if(!this.settings.freeStickersCompat){
								DiscordModules.UserStore.getCurrentUser().premiumType = 2
								}
								if((DiscordModules.SelectedGuildStore.getLastSelectedGuildId() == emoji.guildId) && !emoji.animated && ((DiscordModules.ChannelStore.getChannel(currentChannelId).type <= 0) == true)){
									return
								}
							}
								//if no ghost mode required
								if (msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, "") == ""){
									//console.log("Message empty, no ghost mode needed");
									msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `)
									return;
								}
								let ghostmodetext = "||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​|| _ _ _ _ _ "
								if (msg.content.includes(ghostmodetext)){
									if(msg.content.includes(("https://embed.rauf.wtf/?&image=" + emoji.url.split("?")[0]))){//Duplicate emoji handling (second duplicate)
									msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, ""), msg.content += " " + "https://test.rauf.workers.dev/?&image=" + emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `
									return
									}
									if(msg.content.includes(emoji.url.split("?")[0])){ //Duplicate emoji handling (first duplicate)
									msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, ""), msg.content += " " + "https://embed.rauf.wtf/?&image=" + emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `
									return
									}
									msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, ""), msg.content += " " + emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `//, console.log(msg.content), console.log("Multiple emojis")
									return
								}
								msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, ""), msg.content += ghostmodetext + "\n" + emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `//, console.log(msg.content), console.log("First emoji code ran")
								return
							})
						});
						}
						else
						if(!this.settings.ghostMode) { //If ghost mode is disabled do shitty original method
						Patcher.unpatchAll(DiscordModules.MessageActions)
						//console.log("Classic Method (No Ghost)")
                        Patcher.before(DiscordModules.MessageActions, "sendMessage", (_, [, msg]) => {
							var currentChannelId = BdApi.findModuleByProps("getLastChannelFollowingDestination").getChannelId()
                            msg.validNonShortcutEmojis.forEach(emoji => {
								if (this.settings.PNGemote){
								emoji.url = emoji.url.replace('.webp', '.png')
								}
								if (emoji.url.startsWith("/assets/")) return;
								if(this.settings.emojiBypassForValidEmoji){ //messy
								DiscordModules.UserStore.getCurrentUser().premiumType = 0
								if(!DiscordModules.EmojiInfo.isEmojiFilteredOrLocked(emoji)){
									if(this.settings.freeStickersCompat){
									DiscordModules.UserStore.getCurrentUser().premiumType = 1
									}
								if(!this.settings.freeStickersCompat){
									DiscordModules.UserStore.getCurrentUser().premiumType = 2
									}
								return
								}
								if(this.settings.freeStickersCompat){
								DiscordModules.UserStore.getCurrentUser().premiumType = 1
								}
								if(!this.settings.freeStickersCompat){
								DiscordModules.UserStore.getCurrentUser().premiumType = 2
								}
								if((DiscordModules.SelectedGuildStore.getLastSelectedGuildId() == emoji.guildId) && !emoji.animated && ((DiscordModules.ChannelStore.getChannel(currentChannelId).type <= 0) == true)){
									console.log("Emoji from this server and not animated")
									return
								}
							}
								if(msg.content.includes(("https://embed.rauf.wtf/?&image=" + emoji.url.split("?")[0]))){//Duplicate emoji handling (second duplicate)
									msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, ""), msg.content += " " + "https://test.rauf.workers.dev/?&image=" + emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `
									return
								}
								if(msg.content.includes(emoji.url.split("?")[0])){ //Duplicate emoji handling (first duplicate)
									msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, ""), msg.content += " " + "https://embed.rauf.wtf/?&image=" + emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `
									return
								}
                                msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, emoji.url.split("?")[0] + `?size=${this.settings.emojiSize}&size=${this.settings.emojiSize} `)//, console.log(msg.content), console.log("no ghost")
                            })
                        });
                        //for editing message also
                        Patcher.before(DiscordModules.MessageActions, "editMessage", (_,obj) => {
                            let msg = obj[2].content
                            if (msg.search(/\d{18}/g) == -1) return;
							if (msg.includes(":ENC:")) return; //Fix jank with editing SimpleDiscordCrypt encrypted messages.
                            msg.match(/<a:.+?:\d{18}>|<:.+?:\d{18}>/g).forEach(idfkAnymore=>{
                                obj[2].content = obj[2].content.replace(idfkAnymore, `https://cdn.discordapp.com/emojis/${idfkAnymore.match(/\d{18}/g)[0]}?size=${this.settings.emojiSize}`)
                            })
                        });
                    }
				}

                    if(!this.settings.emojiBypass) Patcher.unpatchAll(DiscordModules.MessageActions)
				
					if(this.settings.freeStickersCompat){
					DiscordModules.UserStore.getCurrentUser().premiumType = 1; //new DiscordModules call
					}
					if(!this.settings.freeStickersCompat){
				   DiscordModules.UserStore.getCurrentUser().premiumType = 2; //new DiscordModules call
					}
				}
                onStart() {
				   this.originalNitroStatus = DiscordModules.UserStore.getCurrentUser().premiumType; //new DiscordModules call
                    this.saveAndUpdate()
					if(this.settings.freeStickersCompat){
					DiscordModules.UserStore.getCurrentUser().premiumType = 1 //new DiscordModules call
					}
					if(!this.settings.freeStickersCompat){
						if(!this.settings.freeStickersCompat){
				   DiscordModules.UserStore.getCurrentUser().premiumType = 2 //new DiscordModules call
						}
					
					}
                }

                onStop() {
					DiscordModules.UserStore.getCurrentUser().premiumType = this.originalNitroStatus;
                    Patcher.unpatchAll();
                }
            };
        };
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/
