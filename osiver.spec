%global version 0.1.0

Name: osiver
Version: %{version}
Release: 1%{?dist}
Summary: Backend server for the Reviso mobile application
License: GPLv3+
URL: https://github.com/DonaldKellett/Osiver
Source0: https://github.com/DonaldKellett/Osiver/archive/refs/tags/v%{version}.tar.gz
BuildArch: noarch
Requires: nodejs mariadb-server python3

%description
Reviso is a mobile application allowing students to achieve
mastery through repetition by training on question sets and
track their own progress over time, as well as allowing
teachers to track students' progress and create graded
question sets to assess students' abilities. Osiver is the
backend server API for Reviso, featuring two types of users:

- Teachers responsible for creating question sets
- Students responsible for training on question sets

Students can freely sign up for an account, while teachers
can only sign up for an account with proper authorization
from the server administrator through a master password.

%prep
%setup -q -n Osiver-%{version}

%install
mkdir -p %{buildroot}/%{_datadir}/osiver
cp package.json %{buildroot}/%{_datadir}/osiver/package.json
cp package-lock.json %{buildroot}/%{_datadir}/osiver/package-lock.json
cp config.js %{buildroot}/%{_datadir}/osiver/config.js
cp app.js %{buildroot}/%{_datadir}/osiver/app.js
cp LICENSE %{buildroot}/%{_datadir}/osiver/LICENSE
cp README.md %{buildroot}/%{_datadir}/osiver/README.md
cp API.md %{buildroot}/%{_datadir}/osiver/API.md
mkdir -p %{buildroot}/%{_datadir}/osiver/routes
cp routes/root.js %{buildroot}/%{_datadir}/osiver/routes/root.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/signup
cp routes/signup/index.js %{buildroot}/%{_datadir}/osiver/routes/signup/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/reset
cp routes/reset/index.js %{buildroot}/%{_datadir}/osiver/routes/reset/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/logout
cp routes/logout/index.js %{buildroot}/%{_datadir}/osiver/routes/logout/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/login
cp routes/login/index.js %{buildroot}/%{_datadir}/osiver/routes/login/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/delete
cp routes/delete/index.js %{buildroot}/%{_datadir}/osiver/routes/delete/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/profile
cp routes/profile/index.js %{buildroot}/%{_datadir}/osiver/routes/profile/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/users
cp routes/users/index.js %{buildroot}/%{_datadir}/osiver/routes/users/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/set/create
cp routes/set/create/index.js %{buildroot}/%{_datadir}/osiver/routes/set/create/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/set/delete
cp routes/set/delete/index.js %{buildroot}/%{_datadir}/osiver/routes/set/delete/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/set/modify
cp routes/set/modify/index.js %{buildroot}/%{_datadir}/osiver/routes/set/modify/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/set/manage
cp routes/set/manage/index.js %{buildroot}/%{_datadir}/osiver/routes/set/manage/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/set/browse
cp routes/set/browse/index.js %{buildroot}/%{_datadir}/osiver/routes/set/browse/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/set/train
cp routes/set/train/index.js %{buildroot}/%{_datadir}/osiver/routes/set/train/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/score/submit
cp routes/score/submit/index.js %{buildroot}/%{_datadir}/osiver/routes/score/submit/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/score/mine
cp routes/score/mine/index.js %{buildroot}/%{_datadir}/osiver/routes/score/mine/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/score/top3
cp routes/score/top3/index.js %{buildroot}/%{_datadir}/osiver/routes/score/top3/index.js
mkdir -p %{buildroot}/%{_datadir}/osiver/routes/score/user
cp routes/score/user/index.js %{buildroot}/%{_datadir}/osiver/routes/score/user/index.js
mkdir -p %{buildroot}/%{_sharedstatedir}/osiver
mkdir -p %{buildroot}/%{_datadir}/osiver/plugins
cp plugins/support.js %{buildroot}/%{_datadir}/osiver/plugins/support.js
cp plugins/sensible.js %{buildroot}/%{_datadir}/osiver/plugins/sensible.js
mkdir -p %{buildroot}/%{_sysconfdir}/osiver
cp config/timeout %{buildroot}/%{_sysconfdir}/osiver/timeout
cp config/master-pw %{buildroot}/%{_sysconfdir}/osiver/master-pw
cp config/jwt-secret %{buildroot}/%{_sysconfdir}/osiver/jwt-secret
cp config/db-pw %{buildroot}/%{_sysconfdir}/osiver/db-pw
cp config/db-host %{buildroot}/%{_sysconfdir}/osiver/db-host
chmod 600 %{buildroot}/%{_sysconfdir}/osiver/master-pw
chmod 600 %{buildroot}/%{_sysconfdir}/osiver/jwt-secret
chmod 600 %{buildroot}/%{_sysconfdir}/osiver/db-pw
chmod 600 %{buildroot}/%{_sysconfdir}/osiver/db-host
cp osiver.sql %{buildroot}/%{_datadir}/osiver/osiver.sql
cat > osiver.sh << EOF
#!/bin/bash

if [ \$# -gt 1 ]; then
  echo 'On first usage:'
  echo ''
  echo '$ sudo su -'
  echo '# osiver --init'
  echo '# exit'
  echo ''
  echo 'Thereafter:'
  echo '- $ sudo osiver'
  echo '- $ osiver --version'
  exit 1
fi

if [ \$# -eq 0 ]; then
  if [ "\$(whoami)" != root ]; then
    echo 'Fatal error: osiver must be run as root when no option is specified'
    exit 1
  fi
  cd %{_datadir}/osiver
  OSIVER_CONF_BASE=%{_sysconfdir}/osiver OSIVER_DATA_BASE=%{_sharedstatedir}/osiver PORT=80 npm start
  exit
fi

if [ "\$1" = --init ]; then
  if [ "\$(whoami)" != root ]; then
    echo 'Fatal error: osiver must be run as root when the --init option is specified'
    exit 1
  fi
  systemctl start mariadb
  mysql_secure_installation
  echo 'Enter the MySQL root password in the line that follows ...'
  mysql -u root -p < %{_datadir}/osiver/osiver.sql
  systemctl stop mariadb
  cd %{_datadir}/osiver
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
echo '# osiver --init'
echo '# exit'
echo ''
echo 'Thereafter:'
echo '- $ sudo osiver'
echo '- $ osiver --version'
exit 1
EOF
mkdir -p %{buildroot}/%{_bindir}
install -m 755 osiver.sh %{buildroot}/%{_bindir}/osiver
cat > osiver.service << EOF
[Unit]
Description=Osiver - Backend server for the Reviso mobile application
Documentation=https://github.com/DonaldKellett/Osiver
Wants=mariadb.service
After=mariadb.service

[Service]
Type=simple
ExecStart=%{_bindir}/osiver

[Install]
WantedBy=multi-user.target
EOF
mkdir -p %{buildroot}/usr/lib/systemd/system
cp osiver.service %{buildroot}/usr/lib/systemd/system/osiver.service

%files
%{_datadir}/osiver/package.json
%{_datadir}/osiver/package-lock.json
%{_datadir}/osiver/config.js
%{_datadir}/osiver/app.js
%license %{_datadir}/osiver/LICENSE
%doc %{_datadir}/osiver/README.md
%{_datadir}/osiver/API.md
%{_datadir}/osiver/routes/root.js
%{_datadir}/osiver/routes/signup/index.js
%{_datadir}/osiver/routes/reset/index.js
%{_datadir}/osiver/routes/logout/index.js
%{_datadir}/osiver/routes/login/index.js
%{_datadir}/osiver/routes/delete/index.js
%{_datadir}/osiver/routes/profile/index.js
%{_datadir}/osiver/routes/users/index.js
%{_datadir}/osiver/routes/set/create/index.js
%{_datadir}/osiver/routes/set/delete/index.js
%{_datadir}/osiver/routes/set/modify/index.js
%{_datadir}/osiver/routes/set/manage/index.js
%{_datadir}/osiver/routes/set/browse/index.js
%{_datadir}/osiver/routes/set/train/index.js
%{_datadir}/osiver/routes/score/submit/index.js
%{_datadir}/osiver/routes/score/mine/index.js
%{_datadir}/osiver/routes/score/top3/index.js
%{_datadir}/osiver/routes/score/user/index.js
%{_sharedstatedir}/osiver
%{_datadir}/osiver/plugins/support.js
%{_datadir}/osiver/plugins/sensible.js
%config(noreplace) %{_sysconfdir}/osiver/timeout
%config(noreplace) %{_sysconfdir}/osiver/master-pw
%config(noreplace) %{_sysconfdir}/osiver/jwt-secret
%config(noreplace) %{_sysconfdir}/osiver/db-pw
%config(noreplace) %{_sysconfdir}/osiver/db-host
%{_datadir}/osiver/osiver.sql
%{_bindir}/osiver
/usr/lib/systemd/system/osiver.service

%changelog
* Thu Apr 01 2021 Donald Sebastian Leung <donaldsebleung@gmail.com> - 0.1.0-1
- First osiver package
