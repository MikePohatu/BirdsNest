# File System Scanner

* [File System Scanner](#file-system-scanner)
  * [Overview](#overview)
  * [Command Line Options](#command-line-options)
  * [Configuration Structure](#configuration-structure)
    * [Threads](#threads)
    * [Datastores](#datastores)
    * [Host](#host)
    * [File System](#file-system)
    * [Credentials](#credentials)
  * [Configuration Details](#configuration-details)
  * [Blocked folders](#blocked-folders)
  * [Results](#results)
  * [Reports](#reports)
  * [FAQ](#faq)

## Overview
The File System Scanner is a multi-threaded Windows file system 'crawler', traversing one or more file systems, interrogating the permissions and mapping them to Active Directory or Builtin objects.

The following points should be noted:

* The scanner does not interrogate files, only folders. This is done for performance reasons, as having to scan files as well could potentially increase scan time by several orders of magnitude. Scanning files will be added as an option in a future version.

* The scanner can only interrogate items it has permissions to. Make sure that the service account running the scanner has the appropriate permissions to read the permissions of all the items you wish to scan.

* The scanner does not record every folder it finds in the database, only ones that have permissions set on them. This is done to reduce the number of nodes in the Visualizer, and the associated 'clutter' and performance impact.

---

## Command Line Options

    Usage: FSScanner.exe /config:<configfile> /batch

By default, FSScanner.exe will search for **fsconfig.json** in the config folder, and will pause when finished so the user can see the resulting output. These options may be overridden with the **/config** and **/batch** options.

`/config:%path_to_config_file%` - override the default location of the config file, for example if you are scanning multiple domains and require multiple configs. 

`/batch` - Normally FSScanner.exe will pause at the end and prompt the user to press a key (see screenshot below. /batch removes this pause and exits immediately. This option is required when running ADScanner from a scheduled task or other automated process where no user interaction is required. 

`/?` - show command line options and exit.

---

## Configuration Structure

The scanner has a inbuilt structure designed to both represent how a file system is attached underlying infrastructure, and control load. 

When you create a configuration for the scanner, it will contain a structure like this:

```json
"maxthreads": 8,
"datastores": [
    {
        "name": "datastore1",
        "host": "server",
        "filesystems": [
            {
                ...  file system 1
            },
            {
                ...  file system 2
            }
        ]
    }
],
"credentials": ...
```

The following sections outline each item. Pay special attention to [Datastores](#datastores) and [Threads](#threads), as these have implications to how the scanner will apply load to your infrastructure. 

### Threads

The File System Scanner is a multi-threaded application. The number of threads the scanner will use is set in the configuration file. Some testing and tuning may be required to find the ideal number of threads to apply to each [Datastore](#datastores) for best performance. The number of threads is configured using the **maxthreads** property.

It should be noted that each time the scanner is run, it is completely independant and unaware of any already running scanners.

### Datastores

A Datastore item represents a set of physical disks on which one or more file systems are located. 

It is recommended to only create one scanner configuration for each datastore, with all relevant file systems listed within the configuration. This way only the specified number of scanning threads can apply load to those physical disks. The following example outlines the potential result of not doing this:

*A set of disks contains 5 file systems. You create an file system scanner configuration for each file system, each with 8 threads, intending to have 8 threads running on the disks at a time. You setup scheduled tasks that run the scanner for each configuration i.e. 5 scheduled tasks. The scan jobs take several hours, and there starts to be overlap i.e. more than one scan job is running at a time. Each scan job has 8 threads, so if 3 are running, that is 3\*8=24 scan threads, not the 8 intended.*

Configuration excerpt:

```json
"datastores": [
    {
        "name": "datastore1",
        "host": "server1",
        "filesystems": [
            {
                "...file system 1"
            },
            {
                "...file system 2"
            }
        ]
    },
    {
        "name": "datastore2",
        "host": "server1",
        "filesystems": [
            {
                "...file system 3"
            },
            {
                "...file system 4"
            }
        ]
    }
],
...
```

### Host

The **Host** item is used to create a connection to a Device node within the the database e.g. an Active Directory computer object. The value of this item is matched against the **name** property of a **Device** data type (**AD_Computer** data types are **Device** data types as well). This match is case sensitive.

### File System

A File System item represents a Windows network file system. The scanner will crawl the file system and read the security permissions of each folder. 

Where a folder cannot be read for whatever reason, it will be recorded as a [blocked folder](#blocked-folders) in the database.

Note that the share permissions are not read.

The **filesystems** section in the configuration is a list of file system objects containing the following properties:
* id -  A unique value to use as the id of the file system in the database.
* credentialid (optional) - The id of the [credential](#credentials) to use to access the file system
* path - The UNC path for root of the scan job. Note the double slashes due to the json file format
* comment (optional) - A description/comment for the file system

```json
"filesystems": [
    {
        "id": "unique-id-1",
        "credentialid": "cred1",
        "path": "\\\\server1\\share1",
        "comment": "san1-share1"
    },
    {
        "id": "unique-id-2",
        "credentialid": "cred1",
        "path": "\\\\server1\\share2",
        "comment": "san1-share2"
    }
],
...
```

### Credentials
The file system scanner will use the context of the user running the fsscanner.exe process by default. This would normally be the logged in user or service account if running as a scheduled task. It is recommended to use this approach where possible.

If you wish you use different credentials to access a file system, you can add a **credentials** section to your configuration with the relevant details. The **id** property is used to reference these credentials in your file system configuration. 

In the example **credentials** section below, note the **cred1** id. 

```json
"credentials": [
    {
        "id": "cred1",
        "username": "username",
        "password": "P@ssword1",
        "domain": "domain.local"
    }
],
...
```

The **cred1** id is then used in the file system configuration in the **creditialid** property to use the credential when scanning this file system. The **id** property below is the id of the file system, not the credential.

```json
...
"filesystems": [
    {
        "id": "123",
        "credentialid": "cred1",
        "path": "\\\\server\\share1",
        "scanfiles": false,
        "comment": "san1-share1"
    },
    ...
```

---

## Configuration Details

The following example shows a full configuration containing one datastore on a host called **server1** and 2 file systems. Note the use double slashes due to the json file format i.e. each \\ becomes \\\\.


```json
"credentials": [
    {
        "id": "cred1",
        "username": "username",
        "password": "P@ssword1",
        "domain": "domain.local"
    }
],
"maxthreads": 10,
"datastores": [
    {
        "name": "datastore1",
        "host": "server1",
        "comment": "san1",
        "filesystems": [
            {
                "id": "123",
                "credentialid": "cred1",
                "path": "\\\\server1\\share1",
                "comment": "san1-share1"
            },
            {
                "id": "456",
                "credentialid": "cred1",
                "path": "\\\\server1\\share2",
                "comment": "san1-share2"
            }
        ]
    }
]
```

---

## Blocked folders
A blocked folder is one where the scanner cannot read it's details, and therefore is blocked from scanning it and it's child folders. The folder will be recorded by the scanner and the property 'blocked' will be set to **true** on the item in the database to allow for searching and reporting.

A blocked usually represents a folder where inheritance is disabled, and there aren't appropriate permissions for the account running the file system scanner.

---

## Results

The following diagram shows example data within the Birdsnest Explorer Visualizer. The diagram shows a shared folder named 'contentstore' with a structure as below:

```
contentstore 
└───Applications
└───Logs
└───Packages
    └───Packages
        └───Restricted
```

The diagram shows the following:

* The contentstore shared folder structure is hosted on a datastore also named 'contentstore' (note the differing icons). 
* The datastore is connected to the SERVER01 device (server)
* The AD group 'ContentStore_RO' is assigned permissions to the contentstore folder
* The Bob.Demo AD user account is assigned permissions to the Logs folder
* An orphaned AD object is assigned permissions to the Applications folder
* The Applications and Logs folders inherit permissions from the contentstore folder
* Inheritance is blocked on the Restricted folder

![Results-Diagram](/documentation/image/file-system/results1.PNG)

---

## Reports
The File System visualizer plugin includes the following reports:

|Report            |Description|
|------------------|:---|
| FS Blocked Folders        | Lists folders that are blocked from being scanned
| FS Deep Permissions	    | Lists folders with permissions that are more that 5 levels deep in the folder structure |
| FS Deny Permissions	    | Lists folders with deny permissions set |
| FS Inheritance Disabled   | Lists folders with inherited permissions disabled |
| FS Orphaned Permissions	| Lists folders with permissions set for deleted accounts |

---

## FAQ

Q - Why does Birdsnest Explorer shows fewer permissions connected to my folder than the permissions tab in Windows?\
A - Birdsnest Explorer will only connect permissions where they have been set on that particular folder. The other permissions listed will be inherited from a parent folder. You will find the group/user listed on the permissions tab connected to the relevant parent folder.