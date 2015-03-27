module.exports = /*@ngInject*/function ($q, $rootScope, $filter, co, crypto, consts, utils) {
	this.importKeys = (jsonBackup) => {
		let importObj = null;
		try {
			importObj = JSON.parse(jsonBackup);
		} catch (error) {
			throw new Error('Invalid keys backup format, json expected!');
		}

		let bodyHash = utils.hexify(openpgp.crypto.hash.sha512(JSON.stringify(importObj.body)));
		if (bodyHash != importObj.bodyHash)
			throw new Error('Backup keys are corrupted!');

		Object.keys(importObj.body.key_pairs).forEach(email => {
			importObj.body.key_pairs[email].prv.forEach(privateKeyArmored => {
				try {
					const privateKey = openpgp.key.readArmored(privateKeyArmored).keys[0];
					crypto.importPrivateKey(privateKey);
				} catch (error) {
				}
			});
			importObj.body.key_pairs[email].pub.forEach(publicKey => {
				try {
					crypto.importPublicKey(publicKey);
				} catch (error) {
				}
			});
		});

		crypto.initialize(crypto.options);
	};

	this.exportKeys = (email = null) => {
		let keyPairs = (email ? [email] : crypto.getAvailableSourceEmails()).reduce((a, email) => {
			a[email] = {
				prv: crypto.getAvailableEncryptedPrivateKeysForEmail(email).map(k => k.armor()),
				pub: crypto.getAvailablePublicKeysForEmail(email).map(k => k.armor())
			};
			return a;
		}, {});

		let body = {
			key_pairs: keyPairs,
			exported: $filter('date')(Date.now(), 'yyyy-MM-dd HH:mm:ss Z')
		};

		let bodyHash = utils.hexify(openpgp.crypto.hash.sha512(JSON.stringify(body)));

		return JSON.stringify({
			readme: consts.KEYS_BACKUP_README,
			body: body,
			bodyHash: bodyHash
		}, null, 4);
	};

	this.getExportFilename = (backup, userName) => {
		let hashPostfix = utils.hexify(openpgp.crypto.hash.md5(backup)).substr(0, 8);
		return `${userName}-${hashPostfix}.json`;
	};
};