﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace common
{
    public static class ListExtensions
    {
        public static List<T> ListPop<T>(List<T> list, int count)
        {
            if (count > list.Count) { count = list.Count; }
            List<T> newlist = new List<T>();
            newlist.AddRange(list.Take(count));
            list.RemoveRange(0, count);
            return newlist;
        }
    }
}
