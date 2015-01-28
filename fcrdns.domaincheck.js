var net_utils = require('./net_utils');

exports.hook_data_post = function (next, connection) {
    var txn = connection.transaction;

    var domain = txn.mail_from.host;
    if (!domain) return next();  // null-sender
    domain = domain.toLowerCase();

    // Get results from connect.fcrdns plugin
    var r = connection.results.get('connect.fcrdns');

    var org_matches_fcrdns = false;
    if (r.fcrdns.length) {
        var fcrdns_domain = net_utils.get_organizational_domain(r.fcrdns[0].toLowerCase());
        var org_domain = net_utils.get_organizational_domain(domain);
        connection.loginfo(this, 'domain=' + org_domain + ' fcrdns_domain=' + fcrdns_domain);
        if (fcrdns_domain === org_domain) org_matches_fcrdns = true;
    }

    // Load configuration file
    var cfg = this.config.get('fcrdns.domaincheck.ini')

    // Debug logging
    if (cfg.main[domain] !== undefined) {
        connection.loginfo(this, 'found domain in configuration file, looking for match: ' + (cfg.main[domain] || domain));
    }

    if (!org_matches_fcrdns || (cfg.main[domain] && cfg.main[domain] !== fcrdns_domain)) {
        var subject = txn.header.get_decoded('Subject');
        txn.remove_header('Subject');
        subject = '[SUSPECT] ' + subject;
        txn.add_header('Subject', subject);
    }

    return next();
}

