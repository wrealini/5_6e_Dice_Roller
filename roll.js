let trackedIds = {};
let isGM = false;
let me;

function saveDID() {
	let discordid = document.getElementById("discord-id").value;
	TS.localStorage.global.setBlob(discordid);
}

function loadDID() {
	try {
		TS.localStorage.global.getBlob().then((discordid) => {
			document.getElementById("discord-id").value = discordid;
		});
		return
	} catch (error) {
	}
}

function roll(nameow,diceow) {
    let name = document.getElementById("roll-name").value || "Check";
    let dice = document.getElementById("roll-content").value || "2d20";
	if (nameow != undefined) {
		name = String(nameow);
	}
	if (diceow != undefined) {
		dice = String(diceow);
	}
	dice = dice.replaceAll(/\s/g, "");
	dice = dice.replaceAll("+"," +");
	dice = dice.replaceAll("-"," -");
	let diceArray = dice.split(" ");
	let dtxt = ["d100","d20","d12","d10","d8","d6","d4","","a"];
	let posn = [ 0,    0,    0,    0,    0,   0,   0,   0, 0];
	let negn = [ 0,    0,    0,    0,    0,   0,   0,   0, 0];
    let ttln = [ 0,    0,    0,    0,    0,   0,   0,   0, 0];
	let out = "";
	let len = diceArray.length;
	for (let i = 0; i < len; i++) {
		let d = diceArray[i];
		let p = !(d.includes("-"));
		d = d.replaceAll("+","");
		d = d.replaceAll("-","");
		let n = 7;
		if (d.endsWith("a")) {
			d = d.replace("a","");
			n = 8;
		} else if (d.endsWith("d100")) {
			d = d.replace("d100","");
			n = 0;
		} else if (d.endsWith("d20")) {
			d = d.replace("d20","");
			n = 1;
		} else if (d.endsWith("d12")) {
			d = d.replace("d12","");
			n = 2;
		} else if (d.endsWith("d10")) {
			d = d.replace("d10","");
			n = 3;
		} else if (d.endsWith("d8")) {
			d = d.replace("d8","");
			n = 4;
		} else if (d.endsWith("d6")) {
			d = d.replace("d6","");
			n = 5;
		} else if (d.endsWith("d4")) {
			d = d.replace("d4","");
			n = 6;
		}
		d = Math.abs(parseInt(d));
        if (isNaN(d)) {
        } else {
        	if (p) {
				posn[n] = posn[n]+d;
        	} else {
				negn[n] = negn[n]+d;
        	}
            ttln[n] = ttln[n]+d;
		}
	}
	let bonust = posn[7] - negn[7];
	let advlvl = posn[8] - negn[8];
	let naa = advlvl != 0;
	let posd = "";
	let negd = "";
	let drollstr = "";
	for (let i = 0; i < 7; i++) {
		let d = posn[i];
		if (d != 0) {
			posd = posd.concat("+",d,dtxt[i]);
		}
        d = negn[i];
		if (d != 0) {
			negd = negd.concat("-",d,dtxt[i]);
		}
        d = ttln[i];
		if (d != 0) {
			if (naa && posn[i] > 0) {
				d = d + Math.abs(advlvl);
				naa = false;
			}
			drollstr = drollstr.concat("+",d,dtxt[i]);
		}
	}
	if (drollstr.startsWith("+")) {
		drollstr = drollstr.substr(1);
	}
    let checkstr = posd.concat(negd);
    if (bonust != 0) {
    	checkstr = checkstr.concat("+",bonust);
    }
    if (naa) {
    	advlvl = 0;
    }
    if (advlvl != 0) {
    	checkstr = checkstr.concat("+",advlvl,"a");
    }
    checkstr = checkstr.replaceAll("+-","-");
	if (checkstr.startsWith("+")) {
		checkstr = checkstr.substr(1);
	}
	name = name.concat(" (",checkstr,")");
	let type = JSON.stringify({"bonust": bonust, "advlvl": advlvl, "posn": posn, "negn": negn});
	// document.getElementById("roll-result").value = drollstr;
	TS.dice.putDiceInTray([{ name: name, roll: drollstr}], true).then((diceSetResponse) => {
        trackedIds[diceSetResponse] = type;
    });
}

async function handleRollResult(rollEvent) {
    if (trackedIds[rollEvent.payload.rollId] == undefined) {
        //if we haven't tracked that roll, ignore it because it's not from us
        return;
    }

    if (rollEvent.kind == "rollResults") {
        //user rolled the dice we tracked and there's a new result for us to look at
        let roll = rollEvent.payload
        let finalResult = 0;
		let resultGroupIn = roll.resultsGroups;
		let resultGroup = {};
		let resultsPositive = [];
		let resultsNegative = [];
		let type = JSON.parse(trackedIds[roll.rollId]);
		let bonust = type.bonust;
		let advlvl = type.advlvl;
		let posn = type.posn;
		let negn = type.negn;
        if (resultGroupIn != undefined && resultGroupIn.length == 1 && bonust != undefined && advlvl != undefined && posn != undefined && posn.length == 9 && negn != undefined && negn.length == 9) {
            //just making sure the roll actually has 1 group and bonust, advlvl, posn, and negn are defined and the correct lengths. should never be false as we created the roll with 1 group and all the expected object properties
			resultGroup.name = resultGroupIn[0].name;
			let jsonstr = JSON.stringify(resultGroupIn);
			jsonstr = jsonstr.replaceAll('","results',"");
			let jsonArray = jsonstr.split('"kind":');
			let len = jsonArray.length;
			jsonstr = "{"
			for (let i = 0; i < len; i++) {
				let substr = jsonArray[i];
				if (substr.startsWith('"d') && substr.includes("]")) {
					let substrArray = substr.split("]");
					jsonstr = jsonstr.concat(substrArray[0],"],");
				}
			}
			jsonstr = jsonstr.concat("}");
			jsonstr = jsonstr.replaceAll(",}","}");
			let allresults = JSON.parse(jsonstr);
			// document.getElementById("roll-result").value = JSON.stringify(type);
			// reformat the results into a single object with only results for each kind of dice rolled
			let dtxt = ["d100","d20","d12","d10","d8","d6","d4","","a"];
			let naa = advlvl != 0;
			for (let i = 0; i < 7; i++) {
				let kind = dtxt[i];
				if (posn[i] > 0) {
					let r = allresults[kind];
					if (naa) {
						r = r.slice(0,posn[i]+Math.abs(advlvl));
						r.sort(function(a, b) {return a - b;});
						let omit = [];
						if (advlvl >= 0) {
							omit = r.slice(0,advlvl);
							r = r.slice(advlvl,r.length);
						} else {
							omit = r.slice(posn[i],r.length);
							r = r.slice(0,posn[i]);
						}
						omit = JSON.stringify(omit);
						resultGroup.name = resultGroup.name.concat("\n(Omit ",kind,": ",omit,")");
						naa = false;
					} else {
						r = r.slice(0,posn[i]);
						r.sort(function(a, b) {return a - b;});
					}
					resultsPositive = resultsPositive.concat({"kind": kind, "results": r});
				}
				if (negn[i] > 0) {
					let r = allresults[kind];
					r = r.slice(r.length-negn[i],r.length);
					r.sort(function(a, b) {return a - b;});
					resultsNegative = resultsNegative.concat({"kind": kind, "results": r});
				}
			}
			if (bonust > 0) {
				resultsPositive = resultsPositive.concat({"value": bonust});
			} else if (bonust < 0) {
				resultsNegative = resultsNegative.concat({"value": -bonust});
			}
			resultsPositive = {"operator":"+","operands":resultsPositive};
			if (resultsNegative.length > 0) {
				resultsNegative = {"operator":"+","operands":resultsNegative};
				resultsPositive = {"operator":"-","operands":[resultsPositive,resultsNegative]};
			}
			resultGroup.result = resultsPositive;
        } else {
            return;
        }

        //finalResult remains unused in this example, but could be useful for other applications
        displayResult(resultGroup, roll.rollId);
    } else if (rollEvent.kind == "rollRemoved") {
        //if you want special handling when the user doesn't roll the dice
        delete trackedIds[rollEvent.payload.rollId];
    }
}

async function displayResult(resultGroup, rollId) {
    TS.dice.sendDiceResult([resultGroup], rollId).catch((response) => console.error("error in sending dice result", response));
}