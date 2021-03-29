%global version 0.1.1

Name: osiv
Version: %{version}
Release: 1%{?dist}
Summary: Minimal example of authentication server with two tiers of users
License: GPLv3+
URL: https://github.com/DonaldKellett/Osiv
Source0: https://github.com/DonaldKellett/Osiv/archive/refs/tags/v%{version}.tar.gz
BuildArch: noarch
Requires: nodejs mariadb-server python3

%description
A minimal example of an authentication server for two tiers of users:

- "Privileged" users that can only be created with a master password
- "Unprivileged" users that can sign up freely

Of course, it is not a hard requirement that "privileged" users have
more rights than "unprivileged" ones, but the idea is that one should
not be able to randomly sign up for a "privileged" account which may
somehow be considered more important than an "unprivileged" one.

%prep
%setup -q -n Osiv-%{version}

%install
mkdir -p %{buildroot}/%{_datadir}/osiv
cp package.json %{buildroot}/%{_datadir}/osiv/package.json
cp package-lock.json %{buildroot}/%{_datadir}/osiv/package-lock.json
cp config.js %{buildroot}/%{_datadir}/osiv/config.js
cp app.js %{buildroot}/%{_datadir}/osiv/app.js
cp LICENSE %{buildroot}/%{_datadir}/osiv/LICENSE
cp API.md %{buildroot}/%{_datadir}/osiv/API.md
mkdir -p %{buildroot}/%{_datadir}/osiv/routes
cp routes/root.js %{buildroot}/%{_datadir}/osiv/routes/root.js
mkdir -p %{buildroot}/%{_datadir}/osiv/routes/signup
cp routes/signup/index.js %{buildroot}/%{_datadir}/osiv/routes/signup/index.js
mkdir -p %{buildroot}/%{_datadir}/osiv/routes/reset
cp routes/reset/index.js %{buildroot}/%{_datadir}/osiv/routes/reset/index.js
mkdir -p %{buildroot}/%{_datadir}/osiv/routes/logout
cp routes/logout/index.js %{buildroot}/%{_datadir}/osiv/routes/logout/index.js
mkdir -p %{buildroot}/%{_datadir}/osiv/routes/login
cp routes/login/index.js %{buildroot}/%{_datadir}/osiv/routes/login/index.js
mkdir -p %{buildroot}/%{_datadir}/osiv/routes/delete
cp routes/delete/index.js %{buildroot}/%{_datadir}/osiv/routes/delete/index.js
mkdir -p %{buildroot}/%{_datadir}/osiv/plugins
cp plugins/support.js %{buildroot}/%{_datadir}/osiv/plugins/support.js
cp plugins/sensible.js %{buildroot}/%{_datadir}/osiv/plugins/sensible.js
mkdir -p %{buildroot}/%{_sysconfdir}/osiv
cp config/timeout %{buildroot}/%{_sysconfdir}/osiv/timeout
cp config/master-pw %{buildroot}/%{_sysconfdir}/osiv/master-pw
cp config/jwt-secret %{buildroot}/%{_sysconfdir}/osiv/jwt-secret
cp config/db-pw %{buildroot}/%{_sysconfdir}/osiv/db-pw
cp config/db-host %{buildroot}/%{_sysconfdir}/osiv/db-host
chmod 600 %{buildroot}/%{_sysconfdir}/osiv/master-pw
chmod 600 %{buildroot}/%{_sysconfdir}/osiv/jwt-secret
chmod 600 %{buildroot}/%{_sysconfdir}/osiv/db-pw
chmod 600 %{buildroot}/%{_sysconfdir}/osiv/db-host
cp osiv.sql %{buildroot}/%{_datadir}/osiv/osiv.sql
cat > osiv.sh << EOF
#!/bin/bash

if [ \$# -gt 1 ]; then
  echo 'On first usage:'
  echo ''
  echo '$ sudo su -'
  echo '# osiv --init'
  echo '# exit'
  echo ''
  echo 'Thereafter:'
  echo '- $ sudo osiv'
  echo '- $ osiv --version'
  exit 1
fi

if [ \$# -eq 0 ]; then
  if [ "\$(whoami)" != root ]; then
    echo 'Fatal error: osiv must be run as root when no option is specified'
    exit 1
  fi
  cd %{_datadir}/osiv
  OSIV_CONF_BASE=%{_sysconfdir}/osiv PORT=80 npm start
  exit
fi

if [ "\$1" = --init ]; then
  if [ "\$(whoami)" != root ]; then
    echo 'Fatal error: osiv must be run as root when the --init option is specified'
    exit 1
  fi
  systemctl start mariadb
  mysql_secure_installation
  echo 'Enter the MySQL root password in the line that follows ...'
  mysql -u root -p < %{_datadir}/osiv/osiv.sql
  systemctl stop mariadb
  cd %{_datadir}/osiv
  npm install
  exit
fi

if [ "\$1" = --version ]; then
  echo "%{version}"
  exit
fi

echo 'On first usage:'
echo ''
echo '$ sudo su -'
echo '# osiv --init'
echo '# exit'
echo ''
echo 'Thereafter:'
echo '- $ sudo osiv'
echo '- $ osiv --version'
exit 1
EOF
mkdir -p %{buildroot}/%{_bindir}
install -m 755 osiv.sh %{buildroot}/%{_bindir}/osiv
cat > osiv.service << EOF
[Unit]
Description=Osiv - Minimal example of authentication server with two tiers of users
Documentation=https://github.com/DonaldKellett/Osiv
Wants=mariadb.service
After=mariadb.service

[Service]
Type=simple
ExecStart=%{_bindir}/osiv

[Install]
WantedBy=multi-user.target
EOF
mkdir -p %{buildroot}/usr/lib/systemd/system
cp osiv.service %{buildroot}/usr/lib/systemd/system/osiv.service

%files
%{_datadir}/osiv/package.json
%{_datadir}/osiv/package-lock.json
%{_datadir}/osiv/config.js
%{_datadir}/osiv/app.js
%license %{_datadir}/osiv/LICENSE
%{_datadir}/osiv/API.md
%{_datadir}/osiv/routes/root.js
%{_datadir}/osiv/routes/signup/index.js
%{_datadir}/osiv/routes/reset/index.js
%{_datadir}/osiv/routes/logout/index.js
%{_datadir}/osiv/routes/login/index.js
%{_datadir}/osiv/routes/delete/index.js
%{_datadir}/osiv/plugins/support.js
%{_datadir}/osiv/plugins/sensible.js
%{_sysconfdir}/osiv/timeout
%{_sysconfdir}/osiv/master-pw
%{_sysconfdir}/osiv/jwt-secret
%{_sysconfdir}/osiv/db-pw
%{_sysconfdir}/osiv/db-host
%{_datadir}/osiv/osiv.sql
%{_bindir}/osiv
/usr/lib/systemd/system/osiv.service

%changelog
* Sun Mar 28 2021 Donald Sebastian Leung <donaldsebleung@gmail.com> - 0.1.1-1
- First osiv package
