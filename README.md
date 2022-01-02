# organmatch

Digital version of OrganMatch

## Server configuration

### Persistence

OrganMatch requires persistent connections between the server and the client. Without persistence, connections with players who are waiting while it is not their turn can be cut because of time limitations.

The Node server at [jpdev.pro](https://jpdev.pro) that manages OrganMatch operates with the HTTP/2 protocol, which supports persistent connections. Because connections to it are proxied through the Apache 2 server, that server, too, has been configured to support the HTTP/2 protocol. Bitnami publishes [instructions for this configuration](https://docs.bitnami.com/bch/apps/trac/administration/enable-http2-apache/). The approach applicable to this server is Approach B. It requires enabling the Apache module `mod_http2` and adding the directives

```markdown
Protocols h2 h2c http/1.1
H2Direct on
```

to the Bitnami-specific virtual-host configuration file.

The Bitnami instructions are incomplete. As [David Gibbs](https://www.geekyramblings.net/2019/02/18/http-2-apache-lightsail/) states, it is also necessary to change the multi-processing module used by Apache by editing the `httpd.conf` file to become:

```bash
LoadModule mpm_event_module modules/mod_mpm_event.so
#LoadModule mpm_prefork_module modules/mod_mpm_prefork.so
```

Apache and Node have default idle timeouts that have been modified. The Apache timeouts are set with this directive in `httpd.conf`:

```bash
ProxyPass /organmatch/ https://jpdev.pro:3003/organmatch/ timeout=1200 connectiontimeout=1200
```

The Node timeout is set with this statement in `index.js`:

```javascript
server.setTimeout(1200000);
```

These settings make all the timeouts 20 minutes.
