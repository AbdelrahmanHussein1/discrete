from flask import Flask, render_template, request, jsonify
import pandas as pd
import networkx as nx

app = Flask(__name__)

# --- Load & clean campus data ---
campus_df = pd.read_csv('Campus data.csv')
campus_df['distance 1'] = campus_df['distance 1'].replace(',', '', regex=True).astype(float)
campus_df['distance 2'] = campus_df['distance 2'].replace(',', '', regex=True).astype(float)
campus_df['time 1'] = campus_df['time 1'].astype(float)
campus_df['time 2'] = campus_df['time 2'].astype(float)

# --- Build graphs ---
distance_graph = nx.Graph()
time_graph = nx.Graph()
for _, row in campus_df.iterrows():
    u,v = row['source'], row['target']
    min_dist = min(row['distance 1'], row['distance 2'])
    min_time = min(row['time 1'], row['time 2'])
    distance_graph.add_edge(u, v, weight=min_dist)
    time_graph.add_edge(u, v, weight=min_time)

@app.route('/')
def home():
    nodes = sorted(set(campus_df['source']) | set(campus_df['target']))
    return render_template('index.html', nodes=nodes)

@app.route('/get_path', methods=['POST'])
def get_path():
    data  = request.get_json()
    start = data['start']
    end   = data['end']
    mode  = data['mode']    # 'distance' or 'time'

    # Choose primary and secondary graphs
    primary   = distance_graph if mode=='distance' else time_graph
    secondary = time_graph if mode=='distance' else distance_graph

    try:
        path        = nx.dijkstra_path(primary, start, end, weight='weight')
        primary_tot = nx.dijkstra_path_length(primary, start, end, weight='weight')
        # compute secondary metric along same path
        secondary_tot = sum(
            secondary[u][v]['weight'] for u,v in zip(path, path[1:])
        )

        return jsonify({
            'path':      path,
            'primary':   round(primary_tot,2),
            'secondary': round(secondary_tot,2)
        })
    except nx.NetworkXNoPath:
        return jsonify({'error':'No path found.'}), 404

if __name__=='__main__':
    app.run(debug=True)
    