﻿using System.DirectoryServices;
using System.Collections.Generic;

namespace ADScanner.ActiveDirectory
{
    public class ADComputer: ADGroupMemberObject
    {
        public override string Label { get { return "AD_COMPUTER"; } }

        public ADComputer(SearchResult result):base(result)
        {
            this.Properties.Add(new KeyValuePair<string, object>("operatingSystem", ADSearchResultConverter.GetSinglestringValue(result, "operatingSystem")));
            this.Properties.Add(new KeyValuePair<string, object>("operatingSystemVersion", ADSearchResultConverter.GetSinglestringValue(result, "operatingSystemVersion")));
        }
    }
}
