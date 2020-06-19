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
using System.Collections.Generic;
using System.Diagnostics;
using Neo4j.Driver.V1;
using System.Linq;
using common;
using System.Net;

namespace FSScanner
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "BirdsNest File System Scanner";
            Stopwatch steptimer = new Stopwatch();
            Stopwatch totaltimer = new Stopwatch();

            Dictionary<string, NetworkCredential> credentials = new Dictionary<string, NetworkCredential>();
            List<DataStore> datastores = new List<DataStore>();

            string _appdir = AppDomain.CurrentDomain.BaseDirectory;
            string neoconfigfile = _appdir + @"\neoconfig.json";
            string configfile = _appdir + @"\fsconfig.json";

            //int relcounter = 0;
            bool batchmode = false;
            string scanid = ShortGuid.NewGuid().ToString();

            IDriver driver = null;

            ConsoleWriter.InitLine(1);
            totaltimer.Start();
            try
            {
                foreach (string arg in args)
                {
                    string[] param = arg.Split(new[] { ":" }, 2, StringSplitOptions.None);
                    switch (param[0].ToUpper())
                    {
                        case "/?":
                            ShowUsage();
                            Environment.Exit(0);
                            break;
                        case "/CONFIG":
                            configfile = param[1];
                            break;
                        case "/BATCH":
                            batchmode = true;
                            break;
                        default:
                            break;
                    }
                }
            }
            catch
            {
                Console.WriteLine("There is a problem with arguments: " + string.Join(" ", args));
                Console.WriteLine("");
                ShowUsage();
                Environment.Exit(1);
            }

            try
            {
                using (Configuration config = Configuration.LoadConfiguration(configfile))
                {
                    foreach (Credential cred in config.Credentials)
                    {
                        NetworkCredential netcred = new NetworkCredential(cred.Username, cred.Password, cred.Domain);
                        credentials.Add(cred.ID, netcred);
                    }
                    datastores = config.Datastores;
                    ConsoleWriter.ShowProgress = config.ShowProgress;
                    ConsoleWriter.SetProgressLineCount(config.MaxThreads);
                }
            }
            catch (Exception e)
            {
                ConsoleWriter.WriteError("There was an error loading your configuration: " + e.Message);
                if (batchmode == false) { Console.ReadLine(); }
                Environment.Exit(1); 
            }
            
            try
            {
                using (NeoConfiguration config = NeoConfiguration.LoadConfigurationFile(neoconfigfile))
                {
                    driver = Neo4jConnector.ConnectToNeo(config);
                }
            }
            catch (Exception e)
            {
                ConsoleWriter.WriteError("There was an error loading your neo4j configuration: " + e.Message);
                if (batchmode == false) { Console.ReadLine(); }
                Environment.Exit(2);
            }
            

            foreach (DataStore ds in datastores)
            {
                
                foreach (FileSystem fs in ds.FileSystems)
                {
                    if (string.IsNullOrEmpty(fs.Path))
                    {
                        ConsoleWriter.WriteWarning("Filesystem missing \"path\" property");
                        continue;
                    }
                    if (string.IsNullOrEmpty(fs.ID))
                    {
                        ConsoleWriter.WriteError("Filesystem does have have an ID configured: " + fs.Path);
                        ConsoleWriter.WriteError("A random ID has been generated for you to use in your config: " + ShortGuid.NewGuid().ToString());
                        if (batchmode == false)
                        {
                            ConsoleWriter.WriteLine("Press any key to continue");
                            Console.ReadLine();
                        }
                        continue;
                    }
                    Crawler crawler = new Crawler(driver, fs);

                    NetworkCredential fscred;
                    if (!string.IsNullOrEmpty(fs.CredentialID) && (credentials.TryGetValue(fs.CredentialID, out fscred)))
                    {
                        crawler.CrawlRoot(ds, fs.Path, fscred);
                    }
                    else
                    {
                        crawler.CrawlRoot(ds, fs.Path);
                    }
                }
            }

            totaltimer.Stop();
            ConsoleWriter.ShowProgress = false;
            ConsoleWriter.ClearProgress();
            ConsoleWriter.WriteLine("Finished in " + (totaltimer.ElapsedMilliseconds/1000) + " seconds");
            ConsoleWriter.WriteLine("Updating metadata");
            Writer.UpdateMetadata(driver);
            ConsoleWriter.WriteLine("Done");
            if (batchmode == true)
            {
                ConsoleWriter.Write("Exiting.");
                for (int i = 0; i < 3; i++)
                {
                    System.Threading.Thread.Sleep(500);
                    ConsoleWriter.Write(".");
                }
            }
            else
            {
                ConsoleWriter.WriteLine();
                ConsoleWriter.WriteLine("Press any key to exit");
                Console.ReadLine();
            }
        }

        private static void ShowUsage()
        {
            ConsoleWriter.WriteLine();
            ConsoleWriter.WriteLine("Usage: FSScanner.exe /config:<configfile> /batch");
            ConsoleWriter.WriteLine("/batch makes scanner run in batch mode and does not wait before exit");
        }
    }
}
