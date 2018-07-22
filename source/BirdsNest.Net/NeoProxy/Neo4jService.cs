﻿using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using common;
using Neo4j.Driver.V1;
using Newtonsoft.Json;

namespace NeoProxy
{
    public class Neo4jService : IDisposable
    {
        public readonly IDriver Driver;

        public Neo4jService()
        {
            string configfile = AppDomain.CurrentDomain.BaseDirectory + @"\config.json";

            //load the config
            using (NeoConfiguration config = NeoConfiguration.ReadConfigurationFromFile(configfile))
            {
                this.Driver = Neo4jConnector.ConnectToNeo(config);
            }
        }

        public object GetAll()
        {
            using (ISession session = this.Driver.Session())
            {
                ResultSet returnedresults = new ResultSet();

                session.ReadTransaction(tx =>
                {
                    string query = "MATCH (n) RETURN n";
                    IStatementResult dbresult = tx.Run(query);
                    returnedresults.Append(ParseResults(dbresult));                    
                });

                session.ReadTransaction(tx =>
                {
                    var resultids = from node in returnedresults.Nodes select node.DbId;
                    string query = "UNWIND $ids AS nodeid " + 
                        "MATCH (n)-[r]->() "+
                        "WHERE ID(n)=nodeid " +
                        "RETURN r";
                    IStatementResult dbresult = tx.Run(query, new { ids = resultids });
                    returnedresults.Append(ParseResults(dbresult));
                });

                return returnedresults;
            }
        }

        private ResultSet ParseResults(IStatementResult neoresult)
        {
            ResultSet results = new ResultSet();

            foreach (IRecord record in neoresult)
            {
                foreach (string key in record.Keys)
                {
                    INode node = record[key] as INode;
                    if (node != null)
                    {
                        results.Nodes.Add(BirdsNestNode.GetNode(node));
                        continue;
                    }

                    IRelationship rel = record[key] as IRelationship;
                    if (rel != null)
                    {
                        results.Edges.Add(BirdsNestRelationship.GetRelationship(rel));
                        continue;
                    }
                }
            }

            return results;
        }

        public void Dispose()
        {
            this.Driver?.Dispose();
        }
    }
}
