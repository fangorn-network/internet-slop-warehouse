using UnityEngine;

public sealed class SignalSweep : MonoBehaviour
{
    private static readonly Vector3[] SignalPositions =
    {
        new(-4, 0.4f, 3), new(3, 0.4f, 3), new(0, 0.4f, 1),
        new(-3, 0.4f, -3), new(4, 0.4f, -2)
    };

    private readonly Transform[] signals = new Transform[SignalPositions.Length];
    private Transform runner;
    private int recovered;
    private float seconds;

    private void Start()
    {
        var camera = new GameObject("Camera").AddComponent<Camera>();
        camera.transform.position = new Vector3(0, 11, -9);
        camera.transform.LookAt(Vector3.zero);
        camera.orthographic = true;
        camera.orthographicSize = 7;
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(0.06f, 0.10f, 0.13f);

        var light = new GameObject("Sun").AddComponent<Light>();
        light.type = LightType.Directional;
        light.transform.rotation = Quaternion.Euler(50, -25, 0);

        Shape(PrimitiveType.Cube, new Vector3(0, -0.2f, 0), new Vector3(12, 0.3f, 9),
            new Color(0.16f, 0.25f, 0.29f));
        runner = Shape(PrimitiveType.Capsule, Vector3.zero, Vector3.one * 0.7f, new Color(0.30f, 0.84f, 1));
        for (int i = 0; i < signals.Length; i++)
        {
            signals[i] = Shape(PrimitiveType.Sphere, SignalPositions[i], Vector3.one * 0.65f,
                new Color(1, 0.73f, 0.24f));
        }
        ResetRound();
    }

    private static Transform Shape(PrimitiveType type, Vector3 position, Vector3 scale, Color color)
    {
        var shape = GameObject.CreatePrimitive(type);
        shape.transform.SetPositionAndRotation(position, Quaternion.identity);
        shape.transform.localScale = scale;
        shape.GetComponent<Renderer>().material.color = color;
        return shape.transform;
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.R)) ResetRound();
        if (recovered == signals.Length) return;

        var x = Axis(KeyCode.D, KeyCode.RightArrow) - Axis(KeyCode.A, KeyCode.LeftArrow);
        var z = Axis(KeyCode.W, KeyCode.UpArrow) - Axis(KeyCode.S, KeyCode.DownArrow);
        var movement = Vector3.ClampMagnitude(new Vector3(x, 0, z), 1);
        var position = runner.position + movement * (6 * Time.deltaTime);
        position.x = Mathf.Clamp(position.x, -5.5f, 5.5f);
        position.z = Mathf.Clamp(position.z, -4, 4);
        runner.position = position;
        seconds += Time.deltaTime;

        foreach (var signal in signals)
        {
            if (!signal.gameObject.activeSelf || (signal.position - position).sqrMagnitude > 0.65f) continue;
            signal.gameObject.SetActive(false);
            recovered++;
        }
    }

    private static int Axis(KeyCode first, KeyCode second) =>
        Input.GetKey(first) || Input.GetKey(second) ? 1 : 0;

    private void ResetRound()
    {
        runner.position = new Vector3(0, 0.65f, -3.7f);
        recovered = 0;
        seconds = 0;
        foreach (var signal in signals) signal.gameObject.SetActive(true);
    }

    private void OnGUI()
    {
        GUILayout.BeginArea(new Rect(16, 16, 276, 92), GUI.skin.box);
        GUILayout.Label($"Signal Sweep   {recovered}/{signals.Length}   {seconds:0.0}s");
        GUILayout.Label(recovered == signals.Length ? "Sweep complete" : "Recover all five signals");
        GUILayout.Label("WASD / arrow keys to move. R to restart.");
        GUILayout.EndArea();
    }
}
