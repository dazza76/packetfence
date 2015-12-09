package pfconfig::namespaces::config::Switch;

=head1 NAME

pfconfig::namespaces::config::Switch

=cut

=head1 DESCRIPTION

pfconfig::namespaces::config::Switch

This module creates the configuration hash associated to switches.conf

=cut

use strict;
use warnings;

use pfconfig::namespaces::config;
use Config::IniFiles;
use pfconfig::log;
use pf::file_paths;
use List::MoreUtils qw(any);

use base 'pfconfig::namespaces::config';

sub init {
    my ($self) = @_;
    $self->{file}            = $switches_config_file;
    $self->{child_resources} = [ 'resource::default_switch', 'resource::switches_ranges' ];
}

sub build_child {
    my ($self) = @_;

    my %tmp_cfg = %{ $self->{cfg} };

    $tmp_cfg{'127.0.0.1'} = {

        #      id                => '127.0.0.1',
        type              => 'PacketFence',
        mode              => 'production',
        SNMPVersionTrap   => '1',
        SNMPCommunityTrap => 'public'
    };

    my @non_inheritable_attributes = qw(is_group);

    foreach my $section_name ( keys %tmp_cfg ) {
        unless ( $section_name eq "default" ) {
            my $inherit_from = $tmp_cfg{$section_name}{group} || "default";
            foreach my $element_name ( keys %{ $tmp_cfg{$inherit_from} } ) {
                next if(any {$_ eq $element_name} @non_inheritable_attributes);
                unless ( exists $tmp_cfg{$section_name}{$element_name} ) {
                    $tmp_cfg{$section_name}{$element_name} = $tmp_cfg{$inherit_from}{$element_name};
                }
            }
        }
    }

    foreach my $switch ( values %tmp_cfg ) {

        # transforming uplink and inlineTrigger to arrays
        foreach my $key (qw(uplink inlineTrigger)) {
            my $value = $switch->{$key} || "";
            $switch->{$key} = [ split /\s*,\s*/, $value ];
        }

        # transforming vlans and roles to hashes
        my %merged = ( Vlan => {}, Role => {}, AccessList => {} );
        foreach my $key ( grep {/(Vlan|Role|AccessList)$/} keys %{$switch} ) {
            next unless my $value = $switch->{$key};
            if ( my ( $type_key, $type ) = ( $key =~ /^(.+)(Vlan|Role|AccessList)$/ ) ) {
                $merged{$type}{$type_key} = $value;
            }
        }
        $switch->{roles}        = $merged{Role};
        $switch->{vlans}        = $merged{Vlan};
        $switch->{access_lists} = $merged{AccessList};
        $switch->{VoIPEnabled}  = (
            $switch->{VoIPEnabled} =~ /^\s*(y|yes|true|enabled|1)\s*$/i
            ? 1
            : 0
        );
        $switch->{mode} = lc( $switch->{mode} );
        $switch->{'wsUser'} ||= $switch->{'htaccessUser'};
        $switch->{'wsPwd'} ||= $switch->{'htaccessPwd'} || '';

        foreach my $cli_default (qw(EnablePwd Pwd User)) {
            $switch->{"cli${cli_default}"} ||= $switch->{"telnet${cli_default}"};
        }
        foreach my $snmpDefault (qw(communityRead communityTrap communityWrite version)) {
            my $snmpkey = "SNMP" . ucfirst($snmpDefault);
            $switch->{$snmpkey} ||= $switch->{$snmpDefault};
        }
    }

    foreach my $key ( keys %tmp_cfg ) {
        $self->cleanup_after_read( $key, $tmp_cfg{$key} );
    }

    return \%tmp_cfg;

}

sub cleanup_after_read {
    my ( $self, $id, $switch ) = @_;
    my $logger = pfconfig::log::get_logger();

    if ( $switch->{uplink} && $switch->{uplink} eq 'dynamic' ) {
        $switch->{uplink_dynamic} = 'dynamic';
        $switch->{uplink}         = undef;
    }
    if ( exists $switch->{inlineTrigger} ) {
        $switch->{inlineTrigger} = [ map { _splitInlineTrigger($_) } @{ $switch->{inlineTrigger} } ];
    }
}

sub _splitInlineTrigger {
    my ($trigger) = @_;
    my ( $type, $value ) = split( /::/, $trigger );
    return { type => $type, value => $value };
}

=back

=head1 AUTHOR

Inverse inc. <info@inverse.ca>

=head1 COPYRIGHT

Copyright (C) 2005-2015 Inverse inc.

=head1 LICENSE

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301,
USA.

=cut

1;

# vim: set shiftwidth=4:
# vim: set expandtab:
# vim: set backspace=indent,eol,start:

