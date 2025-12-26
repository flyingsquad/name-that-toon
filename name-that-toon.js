/**	Assign random names to selected tokens.
 */
 
Hooks.on("renderActorDirectory", (app, html, data) => {
	if (!game.user.isGM)
		return;

    const nameButton = $("<button id='name-that-toon-button'><i class='fas fa-file-text'></i></i>Name That Toon</button>");
    $(html).find(".directory-footer").append(nameButton);
	
	async function getName(table1, table2) {
		// Roll on the tables.

		let name1;
		if (table1) {
			const rollResult1 = await table1.roll();
			name1 = rollResult1.results[0].description;
		}

		let name2;
		if (table2) {
			const rollResult2 = await table2.roll();
			name2 = rollResult2.results[0].description;
		}

		let text = '';
		if (name1)
			text += name1;
		if (text && name2)
			text += ' ';
		if (name2)
			text += name2;
		return text;
	}
	

    nameButton.click(async (ev) => {
		let tokens = canvas.tokens.controlled;
		
		let linkedActor = false;
		let renameLinked = false;
		
		for (let t of tokens) {
			if (t.document.actorLink) {
				linkedActor = true;
				break;
			}
		}

		let prompt;
		if (tokens.length > 0) {
			prompt = `<p>Rename selected tokens.</p>\n`;
			if (linkedActor) {
				prompt += `<div style="display: flex; flex-direction: row"><input type="checkbox" id="renameLinked" value="yes"><label for="renameLinked">Also rename linked actors</label></div>\n`;
			}
		} else {
			prompt = `<p>Copy name to clipboard.</p>\n`;
		}
		
		let nameTables = game.tables.contents.filter((t) => t.description.match(/name table/i));

		const tables = nameTables.sort((a, b) => a.name.localeCompare(b.name));

		// Build the selection dialog

		let tableChoices = tables.reduce((obj, table) => {
			obj[table.id] = table.name;
			return obj;
		}, {});
		tableChoices['0'] = 'None';

		let t1 = game.settings.get('name-that-toon', 'table1');
		let t2 = game.settings.get('name-that-toon', 'table2');
		
		let tableName1, tableName2;

		try {
			const selected = await foundry.applications.api.DialogV2.prompt({
				window: {
					title: "Select Name Tables"
				},
				content: `
				  <form>
					${prompt}
					<div class="form-group">
					<p>
					  <label for="table">Table 1:</label>
					  <select id="table1" name="table">
						${Object.entries(tableChoices).map(([id, name]) => `<option value="${id}"` + (name == t1 ? ' selected="selected"' : "") + `>${name}</option>`).join("")}
					  </select>
					  </p>
					  <p>
					  <label for="table">Table 2:</label>
					  <select id="table2" name="table">
						${Object.entries(tableChoices).map(([id, name]) => `<option value="${id}"` + (name == t2 ? ' selected="selected"' : "") + `>${name}</option>`).join("")}
					  </select>
					  </p>
					</div>
				  </form>
				`,
				ok: {
					label: "Generate Names",
					callback: (event, button, dialog) => {
					  tableName1 = button.form.elements.table1.value;
					  tableName2 = button.form.elements.table2.value;
					  if (button.form.elements.renameLinked)
						renameLinked = button.form.elements.renameLinked.checked;
					  return true;
					}
				}
			});
			if (!selected) {
				return;
			}
		} catch {
			return;
		}

		// Get the selected table

		const table1 = game.tables.get(tableName1);
		const table2 = game.tables.get(tableName2);
		if (!table1 && !table2)
			return ui.notifications.error("No tables selected; no names generated.");

		game.settings.set('name-that-toon', 'table1', tableChoices[tableName1]);
		game.settings.set('name-that-toon', 'table2', tableChoices[tableName2]);

		if (tokens.length <= 0) {
			let name = await getName(table1, table2);
			game.clipboard.copyPlainText(name);
			ui.notifications.notify(`Name ${name} copied to clipboard.`);
			return;
		}

		for (let token of canvas.tokens.controlled) {
		  // Roll on the tables.

			let text = await getName(table1, table2);

			await token.document.update({name: text });
			if (token.document.actorLink && renameLinked) {
				await token.document.actor.update({name: text});
			}
		}
    });
});

/*
 * Create the configuration settings.
 */
Hooks.once('init', async function () {
	game.settings.register('name-that-toon', 'table1', {
	  name: 'First Table Name',
	  hint: 'The name of the first default name table.',
	  scope: 'world',     // "world" = sync to db, "client" = local storage
	  config: true,       // false if you dont want it to show in module config
	  type: String,       // Number, Boolean, String, Object
	  default: "",
	  onChange: value => { // value is the new value of the setting
		//console.log('swade-charcheck | budget: ' + value)
	  }
	});
	game.settings.register('name-that-toon', 'table2', {
	  name: 'Second Table Name',
	  hint: 'The name of the second default name table.',
	  scope: 'world',     // "world" = sync to db, "client" = local storage
	  config: true,       // false if you dont want it to show in module config
	  type: String,       // Number, Boolean, String, Object
	  default: "",
	  onChange: value => { // value is the new value of the setting
		//console.log('swade-charcheck | budget: ' + value)
	  }
	});
});