﻿using System.Collections.Generic;
using System.DirectoryServices;
using neo4jlink;

namespace ADScanner.ActiveDirectory
{
    internal class ADGroup: INode
    {
        public string Name { get; private set; }
        public string Label { get { return "AD_Object"; } }
        public string SubLabel { get; private set; }
        public string ID { get; private set; }
        public string Path { get; private set; }
        public List<KeyValuePair<string, object>> Properties { get; private set; }
        public List<string> MemberDNs { get; private set; }
        public List<string> MemberOfDNs { get; private set; }

        public ADGroup(SearchResult result)
        {
            this.Name = ADSearchResultConverter.GetSinglestringValue(result, "samaccountname");
            this.ID = ADSearchResultConverter.GetSidAsString(result);
            this.Properties = new List<KeyValuePair<string, object>>();
            this.Path = ADSearchResultConverter.GetSinglestringValue(result, "distinguishedName");
            this.MemberDNs = ADSearchResultConverter.GetStringList(result,"member");
            this.MemberOfDNs = ADSearchResultConverter.GetStringList(result, "memberOf");
            this.Properties.Add(new KeyValuePair<string, object>("distinguishedName", ADSearchResultConverter.GetSinglestringValue(result, "distinguishedName")));
            //this.Properties.Add(new KeyValuePair<string, object>("distinguishedName", ADSearchResultConverter.GetSinglestringValue(result, "distinguishedName")));
            string grouptype = ADSearchResultConverter.GetSinglestringValue(result, "groupType");
            if (grouptype == "-2147483646") { this.SubLabel = "AD_Security_Group"; }
            else if (grouptype == "2") { this.SubLabel = "AD_Distribution_Group"; }
        }
    }
}
