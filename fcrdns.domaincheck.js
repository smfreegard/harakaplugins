var net_utils = require('./net_utils');

exports.hook_data_post = function (next, connection) {
    var txn = connection.transaction;

    // Get the sender domain from the first recipient
    // Note: there could be multiple recipients...
    var domain = txn.mail_from.host;
    if (!domain) {
        // null sender
        return next();
    }
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

    // Load domain list
    var domain_list = this.config.get('domain_list', 'list');
    connection.loginfo(this, 'domain list="' + domain_list.join(',') + '"');

    // Found domain in our list; modify the subject
    if (!org_matches_fcrdns) {
        // Save existing subject and remove it
        var subject = txn.header.get_decoded('Subject');
        txn.remove_header('Subject');

        // See if this domain is in our list
        connection.loginfo(this, 'checking domain: ' + domain + ' result:' + domain_list.indexOf(domain));
        if (domain_list.indexOf(domain) !== -1) {
            // Domain doesn't match FCrDNS domain
            subject = "[NO_FCRDNS] " + subject;
        } else {
            subject = "[SUSPECT] " + subject;
        }

        // Add subject header back in to the message
        txn.add_header('Subject', subject);
    }

    return next();
}

