# organmatch

Digital version of OrganMatch

## Introduction

This application is a digital implementation of the card-game OrganMatch, created by Susan Colowick.

## Server configuration

### Persistence

OrganMatch requires persistent connections between the server and the client. Without persistence, connections with players who are waiting while it is not their turn can be cut because of time limitations.

The Node server at [jpdev.pro](https://jpdev.pro) that manages OrganMatch operates with the HTTP/2 protocol, which supports persistent connections.

Browsers connect to the Node server on its port. If the port is omitted from the request, Apache redirects the browser to the port-specific URL. This configuration involves the following entry in `httpd.conf`:

```bash
# ProxyPass /organmatch/ https://jpdev.pro:3003/organmatch/ timeout=1200 connectiontimeout=1200
Redirect /organmatch https://jpdev.pro:3003/organmatch
```

## Development history

Attempts were made to proxy connections to OrganMatch through an Apache 2 server, relying on instructions by [Bitnami](https://docs.bitnami.com/bch/apps/trac/administration/enable-http2-apache/) for “Approach B”, by [David Gibbs](https://www.geekyramblings.net/2019/02/18/http-2-apache-lightsail/), and by others, with:

- Directives in `httpd.conf`:

    ```bash
    LoadModule http2_module modules/mod_http2.so
    LoadModule mpm_event_module modules/mod_mpm_event.so
    #LoadModule mpm_prefork_module modules/mod_mpm_prefork.so
    ProxyPass /organmatch/ https://jpdev.pro:3003/organmatch/ timeout=1200 connectiontimeout=1200
    ```

- Directives in the Bitnami-specific virtual-host configuration file:

    ```bash
    Protocols h2 h2c http/1.1
    H2Direct on
    ```

- A statement in `index.js`:

    ```javascript
    server.setTimeout(1200000);
    ```

This configuration was intended to ensure that the servers would maintain their connections to each other and to clients for at least 20 minutes of idleness.

However, with this configuration erratic disconnections occurred. Therefore, the use of Apache as a reverse proxy was abandoned.
