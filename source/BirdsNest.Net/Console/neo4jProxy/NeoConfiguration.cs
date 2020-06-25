﻿#region license
// Copyright (c) 2019-2020 "20Road"
// 20Road Limited [https://20road.com]
//
// This file is part of BirdsNest.
//
// BirdsNest is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
#endregion
using System;
using System.IO;
using Newtonsoft.Json;

namespace Console.neo4jProxy
{
    public class NeoConfiguration: IDisposable
    {
        [JsonProperty("DB_URI")]
        public string DB_URI { get; set; }

        [JsonProperty("DB_Username")]
        public string DB_Username { get; set; }

        [JsonProperty("DB_Password")]
        public string DB_Password { get; set; }

        [JsonProperty("DB_Timeout")]
        public int DB_Timeout { get; set; } = 15;

        public virtual void Dispose()
        {
            this.DB_Password = string.Empty;
        }

        public static NeoConfiguration LoadConfigurationFile(string filepath)
        {
            NeoConfiguration conf = new NeoConfiguration();

            using (StreamReader reader = File.OpenText(filepath))
            {
                JsonSerializer serializer = new JsonSerializer();
                conf = (NeoConfiguration)serializer.Deserialize(reader, typeof(NeoConfiguration));
            }
            return conf;
        }

        public static NeoConfiguration LoadJsonString(string json)
        {
            NeoConfiguration conf;
            JsonSerializer serializer = new JsonSerializer();

            using (StringReader reader = new StringReader(json))
            {
                conf = (NeoConfiguration)serializer.Deserialize(reader, typeof(NeoConfiguration));
            }
                
            return conf;
        }
    }
}